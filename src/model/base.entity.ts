import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class Base {
  @PrimaryGeneratedColumn({ comment: 'ID' })
  id: number;

  @CreateDateColumn({ name: 'create_date', comment: '创建时间' })
  createDate?: Date;

  @UpdateDateColumn({ name: 'update_date', comment: '更新时间' })
  updateDate?: Date;

  @DeleteDateColumn({ name: 'delete_date', comment: '删除时间' })
  deleteDate?: Date;
}
