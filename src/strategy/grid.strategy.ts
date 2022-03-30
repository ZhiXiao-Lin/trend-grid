import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ticker } from 'ccxt';
import * as inquirer from 'inquirer';
import * as ora from 'ora';
import moment from 'moment';
import { Repository } from 'typeorm';
import { Config, Order } from '../model';
import { BinanceService, PusherService } from '../service';
import { wait } from '../util';

const spinner = ora('正在处理...');

@Injectable()
export class GridStrategy {
  private readonly logger = new Logger(GridStrategy.name);

  constructor(
    @InjectRepository(Config)
    private readonly configRepository: Repository<Config>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly binance: BinanceService,
    private readonly pusher: PusherService,
  ) {}

  async config() {
    this.logger.log('启动网格交互式配置');
    const symbolResult = await inquirer.prompt([
      {
        type: 'input',
        message: '请输入目标交易对：',
        name: 'symbol',
        default: 'BTC',
      },
    ]);
    const symbol = symbolResult.symbol.toUpperCase() + '/USDT';
    spinner.succeed(`交易对：${symbol}`);

    spinner.start(`正在查询${symbol}市价`);
    const ticket = await this.binance.instance.fetchTicker(symbol);
    spinner.succeed(`${symbol}市价：${ticket.close}`);

    const ratioResult = await inquirer.prompt([
      {
        type: 'input',
        message: '请输入网格的买卖比率(单位：%)：',
        name: 'ratio',
        default: 5,
        validate: (val) => {
          if (/^(\d|[1-9]\d+)(\.\d+)?$/.test(val)) {
            return true;
          }
          return '请输入正实数';
        },
      },
    ]);
    const ratio = Number(ratioResult.ratio);
    spinner.succeed(`比率：${ratio}%`);

    const costResult = await inquirer.prompt([
      {
        type: 'input',
        message: '请输入单次交易金额(单位：USDT)（注：单次下注最小10USDT）：',
        name: 'cost',
        default: 30,
        validate: (val) => {
          if (/^(\d|[1-9]\d+)(\.\d+)?$/.test(val)) {
            return val >= 10;
          }
          return '请输入大于等于10的正实数';
        },
      },
    ]);
    const cost = costResult.cost;
    spinner.succeed(`单次交易金额：${cost}USDT`);

    const quantity = Number((cost / ticket.close).toFixed(3));
    if (quantity <= 0) {
      spinner.fail(
        `最小交易数量：${quantity}，保留${3}位小数，四舍五入后小于0，请提高该交易对单次交易金额`,
      );
      process.exit(0);
    }
    spinner.succeed(`最小交易数量：${quantity}`);

    spinner.start(`正在保存配置信息`);

    const data: Partial<Config> = {
      symbol,
      buyPrice: Number(((ticket.close * (100 - ratio)) / 100).toFixed(8)),
      sellPrice: Number(((ticket.close * (100 + ratio)) / 100).toFixed(8)),
      profitRatio: ratio,
      doubleThrowRatio: ratio,
      step: 0,
      amounts: [quantity],
      prices: [],
    };
    const config = await this.configRepository.findOne({ token: 'default' });
    if (config) {
      await this.configRepository.update(config.id, { ...data });
    } else {
      await this.configRepository.save({
        token: 'default',
        ...data,
      });
    }

    spinner.succeed(`配置信息已保存`);
  }

  async start() {
    try {
      while (true) {
        const config = await this.configRepository.findOne({
          token: 'default',
        });
        if (!config) {
          this.logger.error('配置信息异常');
          break;
        }
        let balance = await this.getBalance();
        const ticket = await this.binance.instance.fetchTicker(config.symbol);
        const fractionDigits =
          ticket.close.toString().split('.')[1]?.length ?? 0;
        const [isTrendUp, isTrendDown] = await this.binance.calcAngle(
          config.symbol,
          '5m',
          fractionDigits,
        );
        spinner.info(
          `${ticket.symbol} 市价：${ticket.close} -- ${
            !!isTrendUp ? '⬆️' : ''
          } ${!!isTrendDown ? '⬇️' : ''} ${ticket.percentage}% -- 买入价：${
            config.buyPrice
          }, 卖出价：${config.sellPrice}, 步数：${config.step}`,
        );

        if (config.buyPrice >= ticket.close && isTrendUp) {
          const amount = this.getAmount(config, 'buy');
          spinner.info(`${ticket.close}买入${config.symbol}-${amount}`);

          // 判断余额
          if (amount * ticket.close <= balance['USDT']) {
            try {
              const order = await this.binance.instance.createMarketOrder(
                ticket.symbol,
                'buy',
                amount,
              );
              console.log('买入下单：', order);
              if (order && order.id) {
                await this.orderRepository.save({
                  orderNo: order.id,
                  symbol: order.symbol,
                  type: order.type,
                  side: order.side,
                  amount: order.amount,
                  average: order.average,
                  datetime: order.datetime,
                  trades: order.trades,
                  fee: order.fee,
                  info: order.info,
                });

                const ratio = await this.getRatio(config, ticket.percentage);
                const price = await this.getPrice(
                  { ...config, ...ratio },
                  order.average,
                );
                const step = config.step + 1;

                await this.configRepository.update(config.id, {
                  ...ratio,
                  ...price,
                  step,
                  prices: [...config.prices, order.average],
                });
                balance = await this.getBalance();
                await this.pusher.sendOrderMessage(`买入下单成功`, {
                  ...order,
                  ...price,
                  currentPrice: ticket.close,
                  step,
                  balance,
                });

                await wait(1000 * 60);
              }
            } catch (err) {
              console.error(err);
              await this.pusher.sendMessage(`买入下单失败`);
              await wait(1000 * 60);
            }
          } else {
            console.log(`余额不足, 当前${balance['USDT']}`);
          }
        }

        if (config.sellPrice < ticket.close && isTrendDown) {
          if (config.step === 0) {
            spinner.info('防止踏空，调整价格');
            const price = await this.getPrice(config, config.sellPrice);
            await this.configRepository.update(config.id, {
              ...price,
            });
          } else {
            const lastPrice = config.prices[config.step - 1] ?? 0;
            const amount = this.getAmount(config, 'sell');
            const profit = (ticket.close - lastPrice) * amount;
            spinner.info(
              `${ticket.close}卖出${ticket.symbol}-${amount}，预计盈利${profit}`,
            );
            try {
              const order = await this.binance.instance.createMarketOrder(
                ticket.symbol,
                'sell',
                amount,
              );
              console.log('卖出下单：', order);
              if (order && order.id) {
                await this.orderRepository.save({
                  orderNo: order.id,
                  symbol: order.symbol,
                  type: order.type,
                  side: order.side,
                  amount: order.amount,
                  average: order.average,
                  datetime: order.datetime,
                  trades: order.trades,
                  fee: order.fee,
                  info: order.info,
                  profit,
                });

                const ratio = await this.getRatio(config, ticket.percentage);
                const price = await this.getPrice(
                  { ...config, ...ratio },
                  order.average,
                );

                const prices = [...config.prices];
                prices.pop();
                const step = config.step - 1;

                await this.configRepository.update(config.id, {
                  ...ratio,
                  ...price,
                  step,
                  prices,
                });
                balance = await this.getBalance();
                await this.pusher.sendOrderMessage(
                  `卖出下单成功，预计盈利：${profit}`,
                  {
                    ...order,
                    ...price,
                    currentPrice: ticket.close,
                    profit,
                    step,
                    balance,
                  },
                );

                await wait(1000 * 60);
              }
            } catch (err) {
              console.error(err);
              await this.pusher.sendMessage(`卖出下单失败`);
              await wait(1000 * 60);
            }
          }
        }

        // await this.autoAdjustPrice(config, ticket);

        await wait(3000);
      }
    } catch (err) {
      // await this.pusher.sendMessage('网格异常');
      console.error(err);
      await wait(3000);
      await this.start();
    }
  }

  private async getBalance() {
    return await this.binance.instance.fetchFreeBalance();
  }

  private async autoAdjustPrice(config: Config, ticket: Ticker) {
    if (moment().diff(moment(config.updateDate), 'h') >= 12) {
      console.log('自动调价');
      const lastPrice = config.prices[config.step - 1] ?? ticket.close;
      const ratio = this.getRatio(config, ticket.percentage);
      const price = await this.getPrice({ ...config, ...ratio }, lastPrice);
      await this.configRepository.update(config.id, {
        ...ratio,
        ...price,
      });
      const balance = await this.getBalance();
      await this.pusher.sendPriceMessage(`自动调价`, {
        ...price,
        step: config.step,
        balance,
      });
    }
  }

  private getRatio(config: Config, percentage: number) {
    // 这是单边走势情况 只改变一方的比率
    if (Math.abs(percentage) > 8) {
      // 单边上涨，补仓比率不变
      if (percentage > 0) {
        return {
          profitRatio: 5 + config.step,
          doubleThrowRatio: 5 + config.step / 4,
        };
      }
      // 单边下跌
      else {
        return {
          profitRatio: 5 + config.step / 4,
          doubleThrowRatio: 5 + config.step,
        };
      }
    }
    // 系数内震荡行情
    else {
      return {
        profitRatio:
          1 +
          (Math.abs(percentage) > 1 ? 0.5 : percentage / 2) +
          config.step / 4,
        doubleThrowRatio:
          1 +
          (Math.abs(percentage) > 1 ? 0.5 : percentage / 2) +
          config.step / 4,
      };
    }
  }

  private getPrice(config: Config, fillPrice: number) {
    const fractionDigits =
      (fillPrice.toString().split('.')[1]?.length ?? 0) + 2;

    return {
      buyPrice: Number(
        (fillPrice * (1 - config.doubleThrowRatio / 100)).toFixed(
          fractionDigits,
        ),
      ),
      sellPrice: Number(
        (fillPrice * (1 + config.profitRatio / 100)).toFixed(fractionDigits),
      ),
    };
  }

  private getAmount(config: Config, side: 'buy' | 'sell') {
    // const curStep = side === 'buy' ? config.step : config.step - 1;
    const amount = config.amounts[0];
    // 当前仓位 > 设置的仓位 取最后一位
    // if (curStep < config.amounts.length) {
    //   amount = config.amounts[curStep < 0 ? 0 : curStep];
    // } else {
    //   amount = config.amounts[config.amounts.length - 1];
    // }

    return Number(amount);
  }
}
