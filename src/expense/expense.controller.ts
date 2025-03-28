// backend/src/expense/expense.controller.ts (mostly unchanged, fixed update method)
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
    const userId = req.user.id;
    return this.expenseService.getExpenses(userId);
  }

  @Post()
  async addExpense(@Body() expense: Omit<Expense, 'id' | 'userId'>, @Request() req): Promise<Expense> {
    const userId = req.user.id;
    const newExpense = { ...expense, userId };
    return this.expenseService.addExpense(newExpense);
  }

  @Put(':id')
  async updateExpense(@Param('id') id: string, @Body() expense: Expense, @Request() req): Promise<Expense> {
    const userId = req.user.id;
    if (expense.userId && expense.userId !== userId) {
      throw new UnauthorizedException('You can only update your own expenses');
    }
    return this.expenseService.updateExpense(id, expense, userId); // Fixed to call updateExpense
  }

  @Delete(':id')
  async deleteExpense(@Param('id') id: string, @Request() req): Promise<void> {
    const userId = req.user.id;
    await this.expenseService.deleteExpense(id, userId);
  }
}