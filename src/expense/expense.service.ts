// backend/src/expense/expense.service.ts (fixed)
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { User } from '../auth/user.entity';
import { In } from 'typeorm';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepo: Repository<Expense>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getExpenses(userId: number): Promise<Expense[]> {
    // Fetch expenses
    const expenses = await this.expenseRepo
      .createQueryBuilder('expense')
      .where('expense.userId = :userId', { userId })
      .orWhere(':userIdStr = ANY (SELECT jsonb_array_elements(expense.sharedWith)->>\'userId\' FROM expense)', { userIdStr: userId.toString() })
      .getMany();

    // Check if any expense has a non-undefined sharedWith with length > 0
    if (!expenses.some(expense => expense.sharedWith && expense.sharedWith.length > 0)) {
      return expenses;
    }

    // Collect all user IDs from sharedWith
    const allUserIds = new Set<string>();
    expenses.forEach(expense => {
      if (expense.sharedWith) {
        expense.sharedWith.forEach(shared => allUserIds.add(shared.userId));
      }
    });

    // Fetch user names
    const users = await this.userRepo.find({
      where: { id: In([...allUserIds].map(id => parseInt(id))) },
      select: ['id', 'name']
    });
    const userMap = new Map(users.map(user => [user.id.toString(), user.name]));

    // Enhance response with names
    return expenses.map(expense => {
      if (expense.sharedWith) {
        expense.sharedWith = expense.sharedWith.map(shared => ({
          ...shared,
          name: userMap.get(shared.userId) || 'Unknown User'
        }));
      }
      return expense;
    });
  }

  async addExpense(expense: Omit<Expense, 'id' | 'userId'> & { userId: number }): Promise<Expense> {
    if (expense.sharedWith && expense.sharedWith.length > 0) {
      const totalUsers = expense.sharedWith.length + 1; // Include the owner
      const sharePerUser = expense.amount / totalUsers;
  
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

    if (expense.sharedWith && expense.sharedWith.length > 0) {
      const totalUsers = expense.sharedWith.length + 1;
      const sharePerUser = expense.amount / totalUsers;
      
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