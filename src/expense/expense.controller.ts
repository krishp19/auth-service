// backend/src/expense/expense.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Expense } from './expense.entity';

@Controller('api/expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  async getExpenses(@Request() req): Promise<Expense[]> {
    const userId = req.user.id; // Get userId from authenticated user
    return this.expenseService.getExpenses(userId);
  }

  @Post()
  async addExpense(@Body() expense: Omit<Expense, 'id'>, @Request() req): Promise<Expense> {
    const userId = req.user.id;
    if (expense.userId !== userId) {
      throw new UnauthorizedException('You can only add expenses for yourself');
    }
    return this.expenseService.addExpense(expense);
  }

  @Put(':id')
  async updateExpense(@Param('id') id: string, @Body() expense: Expense, @Request() req): Promise<Expense> {
    const userId = req.user.id;
    if (expense.userId !== userId) {
      throw new UnauthorizedException('You can only update your own expenses');
    }
    return this.expenseService.updateExpense(id, expense, userId);
  }

  @Delete(':id')
  async deleteExpense(@Param('id') id: string, @Request() req): Promise<void> {
    const userId = req.user.id;
    await this.expenseService.deleteExpense(id, userId);
  }
}