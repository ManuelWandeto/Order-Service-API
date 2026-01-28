import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { UserRole } from '../models/User';
import { env } from '../config/env';

export class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async register(email: string, password: string): Promise<{ token: string; user: any }> {
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.create({
      email,
      passwordHash,
      role: UserRole.CUSTOMER, // Default role
    });

    const token = this.generateToken(user.id, user.role);
    return { token, user };
  }

  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.role);
    return { token, user };
  }

  private generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: '1d' });
  }
}
