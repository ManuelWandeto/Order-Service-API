import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { UserRole } from '../models/User';

// Mock dependencies
jest.mock('../repositories/UserRepository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    mockUserRepo = (authService as any).userRepo;
  });

  describe('register', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const passwordHash = 'hashedPassword';
    const userId = 'user-uuid-123';
    const token = 'jwt-token';

    it('should successfully register a new user', async () => {
      const mockUser = {
        id: userId,
        email,
        passwordHash,
        role: UserRole.CUSTOMER,
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(passwordHash);
      mockUserRepo.create.mockResolvedValue(mockUser as any);
      (jwt.sign as jest.Mock).mockReturnValue(token);

      const result = await authService.register(email, password);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email,
        passwordHash,
        role: UserRole.CUSTOMER,
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, role: UserRole.CUSTOMER },
        expect.any(String),
        { expiresIn: '1d' }
      );
      expect(result).toEqual({ token, user: mockUser });
    });

    it('should throw error if email already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        id: userId,
        email,
        passwordHash,
        role: UserRole.CUSTOMER,
      } as any);

      await expect(authService.register(email, password)).rejects.toThrow('Email already exists');
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const passwordHash = 'hashedPassword';
    const userId = 'user-uuid-123';
    const token = 'jwt-token';

    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: userId,
        email,
        passwordHash,
        role: UserRole.CUSTOMER,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(token);

      const result = await authService.login(email, password);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, passwordHash);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, role: UserRole.CUSTOMER },
        expect.any(String),
        { expiresIn: '1d' }
      );
      expect(result).toEqual({ token, user: mockUser });
    });

    it('should throw error if user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is incorrect', async () => {
      const mockUser = {
        id: userId,
        email,
        passwordHash,
        role: UserRole.CUSTOMER,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
});
