// backend/src/auth/auth.service.ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async signup(name: string, email: string, password: string, profilePic?: Express.Multer.File) {
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('This email is already in use.');
    }

    let profilePicUrl: string | undefined;
    if (profilePic) {
      const result = await cloudinary.uploader.upload(profilePic.path, {
        folder: 'expense_tracker_profiles',
      });
      profilePicUrl = result.secure_url;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ 
      name, 
      email, 
      password: hashedPassword,
      profilePic: profilePicUrl,
    });
    await this.userRepo.save(user);

    return { message: 'Signup successful. Now you can login.' };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ id: user.id, email: user.email });
    return { token };
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      select: ['id', 'name', 'email', 'profilePic', 'about'], // Exclude password
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async updateUser(userId: number, updateData: { name?: string; profilePic?: Express.Multer.File; about?: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (updateData.name) user.name = updateData.name;
    if (updateData.about !== undefined) user.about = updateData.about;

    if (updateData.profilePic) {
      if (user.profilePic) {
        const publicId = user.profilePic.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`expense_tracker_profiles/${publicId}`);
        }
      }
      const result = await cloudinary.uploader.upload(updateData.profilePic.path, {
        folder: 'expense_tracker_profiles',
      });
      user.profilePic = result.secure_url;
    }

    await this.userRepo.save(user);
    return { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      profilePic: user.profilePic, 
      about: user.about 
    };
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepo.find({
      select: ['id', 'name', 'email', 'profilePic', 'about'],
    });
  }
}