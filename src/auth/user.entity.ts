// backend/src/auth/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true }) // Optional profile picture URL
  profilePic?: string;

  @Column({ nullable: true }) // Optional about text
  about?: string;
}