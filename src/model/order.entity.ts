import { Column, Entity } from 'typeorm';
import { Base } from './base.entity';

@Entity({ name: 't_order' })
export class Order extends Base {
  @Column({
    name: 'order_no',
    comment: '订单号',
  })
  orderNo: string;

  @Column({
    comment: '交易对',
  })
  symbol: string;

  @Column({
    comment: '类型',
  })
  type: string;

  @Column({
    comment: '方向',
  })
  side: string;

  @Column({
    comment: '均价',
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0,
  })
  average: number;

  @Column({
    comment: '数量',
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0,
  })
  amount: number;

  @Column({
    comment: '预计盈利',
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0,
  })
  profit: number;

  @Column({
    comment: '下单时间',
    type: 'datetime',
  })
  datetime: string;

  @Column({
    comment: '交易记录',
    type: 'simple-json',
    nullable: true,
  })
  trades: any;

  @Column({
    comment: '手续费',
    type: 'simple-json',
    nullable: true,
  })
  fee: any;

  @Column({
    comment: '其他信息',
    type: 'simple-json',
    nullable: true,
  })
  info: any;
}
