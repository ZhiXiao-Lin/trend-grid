import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ccxt from 'ccxt';

@Injectable()
export class BinanceService {
  private readonly ex: ccxt.binance;

  constructor(private readonly config: ConfigService) {
    this.ex = new ccxt.binance({
      apiKey: this.config.get('binance.apiKey'),
      secret: this.config.get('binance.apiSecret'),
      enableRateLimit: true,
    });
  }

  get instance() {
    return this.ex;
  }

  async calcSMA5(
    symbol: string,
    timeframe: string = '5m',
    fractionDigits: number = 2,
  ) {
    const klines = await this.ex.fetchOHLCV(symbol, timeframe, undefined, 6);
    let lastMA5 = 0;
    let nextMA5 = 0;
    for (let i = 0; i < klines.length; i++) {
      if (i === 0) {
        lastMA5 += Number(klines[i][4]);
      } else if (i === 5) {
        nextMA5 += Number(klines[i][4]);
      } else {
        lastMA5 += Number(klines[i][4]);
        nextMA5 += Number(klines[i][4]);
      }
    }
    return [
      Number((lastMA5 / 5).toFixed(fractionDigits)),
      Number((nextMA5 / 5).toFixed(fractionDigits)),
    ];
  }

  async calcAngle(
    symbol: string,
    timeframe: string = '5m',
    fractionDigits: number = 2,
  ) {
    const [lastMA5, tempMA5] = await this.calcSMA5(
      symbol,
      timeframe,
      fractionDigits,
    );
    return [tempMA5 >= lastMA5, tempMA5 <= lastMA5];
  }
}
