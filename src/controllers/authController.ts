import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UserZodSchema } from '../models/User';

const authService = new AuthService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = UserZodSchema.parse(req.body);
    const result = await authService.register(email, password);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body; // Validation can be loose here or strict
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    next(error); // Error middleware will handle 400/500
  }
};
