// backend/src/expense/expense.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { In } from 'typeorm';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepo: Repository<Expense>,
  ) {}

  async getExpenses(userId: number): Promise<Expense[]> {
    // Fetch expenses where the user is either the owner or in sharedWith
    return this.expenseRepo
      .createQueryBuilder('expense')
      .where('expense.userId = :userId', { userId })
      .orWhere(':userIdStr = ANY (SELECT jsonb_array_elements(sharedWith)->>\'userId\' FROM expense)', { userIdStr: userId.toString() })
      .getMany();
  }

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    // Calculate shares if sharedWith is provided
    if (expense.sharedWith && expense.sharedWith.length > 0) {
      const totalUsers = expense.sharedWith.length + 1; // Include the owner
      const sharePerUser = expense.amount / totalUsers;
      
      // Update shares in sharedWith
      expense.sharedWith = expense.sharedWith.map(user => ({
        userId: user.userId,
        share: sharePerUser,
      }));
    }

    const newExpense = this.expenseRepo.create(expense);
    return this.expenseRepo.save(newExpense);
  }

  async updateExpense(id: string, expense: Expense, userId: number): Promise<Expense> {
    const existingExpense = await this.expenseRepo.findOne({ where: { id, userId } });
    if (!existingExpense) {
      throw new NotFoundException('Expense not found or you do not have permission to update it');
    }

    // Calculate shares if sharedWith is provided
    if (expense.sharedWith && expense.sharedWith.length > 0) {
      const totalUsers = expense.sharedWith.length + 1; // Include the owner
      const sharePerUser = expense.amount / totalUsers;
      
      // Update shares in sharedWith
      expense.sharedWith = expense.sharedWith.map(user => ({
        userId: user.userId,
        share: sharePerUser,
      }));
    }

    await this.expenseRepo.update(id, expense);

    const updatedExpense = await this.expenseRepo.findOne({ where: { id } });
    if (!updatedExpense) {
      throw new NotFoundException('Failed to retrieve the updated expense');
    }

    return updatedExpense;
  }

  async deleteExpense(id: string, userId: number): Promise<void> {
    const expense = await this.expenseRepo.findOne({ where: { id, userId } });
    if (!expense) {
      throw new NotFoundException('Expense not found or you do not have permission to delete it');
    }
    await this.expenseRepo.delete(id);
  }
}