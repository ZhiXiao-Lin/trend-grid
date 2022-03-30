import { HttpService } from '@ionia/http';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PusherService {
  BASE_URL = 'http://wxpusher.zjiecode.com/api';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async sendMessage(content: string, type: 1 | 2 | 3 = 1) {
    const isDev = this.config.get('isDev');
    try {
      return await this.http.post(`${this.BASE_URL}/send/message`, {
        data: {
          appToken: await this.config.get('pusher.appToken'),
          summary: `${isDev ? '本地-' : ''}${content}`,
          content,
          contentType: type,
          uids: await this.config.get('pusher.uids'),
        },
      });
    } catch (err) {
      console.error(err);
    }
  }

  async sendPriceMessage(summary: string, order: any) {
    const isDev = this.config.get('isDev');
    try {
      return await this.http.post(`${this.BASE_URL}/send/message`, {
        data: {
          appToken: await this.config.get('pusher.appToken'),
          summary: `${isDev ? '本地-' : ''}${summary}`,
          content: `<table>
            <tr>
              <td>下次买入价</td>
              <td>${order.buyPrice}</td>
            </tr>
            <tr>
              <td>下次卖出价</td>
              <td>${order.sellPrice}</td>
            </tr>
            <tr>
              <td>当前仓位</td>
              <td>${order.step}</td>
            </tr>
            <tr>
              <td>BTC余额</td>
              <td>${order.balance['BTC']}</td>
            </tr>
            <tr>
              <td>USDT余额</td>
              <td>${order.balance['USDT']}</td>
            </tr>
            <tr>
              <td>BNB余额</td>
              <td>${order.balance['BNB']}</td>
            </tr>
          </table>
          `,
          contentType: 2,
          uids: await this.config.get('pusher.uids'),
        },
      });
    } catch (err) {
      console.error(err);
    }
  }

  async sendOrderMessage(summary: string, order: any) {
    const isDev = this.config.get('isDev');
    try {
      return await this.http.post(`${this.BASE_URL}/send/message`, {
        data: {
          appToken: await this.config.get('pusher.appToken'),
          summary: `${isDev ? '本地-' : ''}${summary}`,
          content: `<table>
            <tr>
              <td>时间</td>
              <td>${order.datetime}</td>
            </tr>
            <tr>
              <td>订单号</td>
              <td>${order.id}</td>
            </tr>
            <tr>
              <td>交易对</td>
              <td>${order.symbol}</td>
            </tr>
            <tr>
              <td>方向</td>
              <td>${order.type === 'market' ? '市价' : '限价'}${
            order.side === 'buy' ? '买入' : '卖出'
          }</td>
            </tr>
            <tr>
              <td>挂单价(USDT)</td>
              <td>${order.currentPrice}</td>
            </tr>
            <tr>
              <td>均价(USDT)</td>
              <td>${order.average}</td>
            </tr>
            <tr>
              <td>数量</td>
              <td>${order.amount}</td>
            </tr>
            <tr>
              <td>手续费(${order.fee.currency})</td>
              <td>${order.fee.cost} </td>
            </tr>
            ${
              order.side === 'sell'
                ? `<tr>
            <td>利润(USDT)</td>
            <td style="color: ${order.profit >= 0 ? 'green' : 'red'};">${
                    order.profit
                  }</td>
          </tr>`
                : ''
            }
            <tr>
              <td>下次买入价</td>
              <td>${order.buyPrice}</td>
            </tr>
            <tr>
              <td>下次卖出价</td>
              <td>${order.sellPrice}</td>
            </tr>
            <tr>
              <td>当前仓位</td>
              <td>${order.step}</td>
            </tr>
            <tr>
              <td>BTC余额</td>
              <td>${order.balance['BTC']}</td>
            </tr>
            <tr>
              <td>USDT余额</td>
              <td>${order.balance['USDT']}</td>
            </tr>
            <tr>
              <td>BNB余额</td>
              <td>${order.balance['BNB']}</td>
            </tr>
          </table>
          `,
          contentType: 2,
          uids: await this.config.get('pusher.uids'),
        },
      });
    } catch (err) {
      console.error(err);
    }
  }
}
