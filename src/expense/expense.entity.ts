// backend/src/expense/expense.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('float', { default: 0 })
  amount: number;


  @Column()
  date: string;

  @Column()
  category: string;

  @Column()
  paymentMethod: string;

  @Column()
  userId: number;

  @Column('json', { nullable: true })
  sharedWith?: { userId: string; share: number }[];
}