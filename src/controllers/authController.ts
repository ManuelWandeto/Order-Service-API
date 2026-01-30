import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UserZodSchema } from '../models/User';
import logger from '../utils/logger';

const authService = new AuthService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = UserZodSchema.parse(req.body);
    const result = await authService.register(email, password);

    logger.info('User registered', {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body; // Validation can be loose here or strict
    const result = await authService.login(email, password);

    logger.info('User logged in', {
      userId: result.user.id,
      email: result.user.email,
    });

    res.json(result);
  } catch (error) {
    next(error); // Error middleware will handle 400/500
  }
};
