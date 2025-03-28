// backend/src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Req, Get, UnauthorizedException, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @UseInterceptors(FileInterceptor('profilePic', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async signup(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('password') password: string,
    @UploadedFile() profilePic?: Express.Multer.File,
  ) {
    return this.authService.signup(name, email, password, profilePic);
  }

  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string) {
    return this.authService.login(email, password);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req) {
    return { message: 'Logged out successfully' };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getUsers() {
    return this.authService.getAllUsers();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    const userId = req.user.id;
    return this.authService.getProfile(userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profilePic', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async updateProfile(
    @Req() req,
    @Body('name') name?: string,
    @Body('about') about?: string,
    @UploadedFile() profilePic?: Express.Multer.File,
  ) {
    const userId = req.user.id;
    return this.authService.updateUser(userId, { name, profilePic, about });
  }
}