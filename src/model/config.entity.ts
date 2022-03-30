import { Column, Entity } from 'typeorm';
import { Base } from './base.entity';

@Entity({ name: 't_config' })
export class Config extends Base {
  @Column({
    comment: '标识',
  })
  token: string;

  @Column({
    comment: '交易对',
  })
  symbol: string;

  @Column({
    name: 'profit_ratio',
    comment: '止盈比率',
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 0,
  })
  profitRatio: number;

  @Column({
    name: 'double_throw_ratio',
    comment: '对冲比率',
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 0,
  })
  doubleThrowRatio: number;

  @Column({
    name: 'buy_price',
    comment: '下次买入价',
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0,
  })
  buyPrice: number;

  @Column({
    name: 'sell_price',
    comment: '下次卖出价',
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0,
  })
  sellPrice: number;

  @Column({
    comment: '持仓手数',
    default: 0,
  })
  step: number;

  @Column({
    comment: '成交价数组',
    type: 'simple-array',
  })
  prices: number[];

  @Column({
    comment: '成交量数组',
    type: 'simple-array',
  })
  amounts: number[];
}
