import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Custom parsing can be added here (e.g., ZodError, Mongoose ValidationError)
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation Error',
      errors: err.issues.map((issue) => ({
        path: issue.path,
        message: issue.message
      }))
    });
  }

  // Map specific error messages to status codes
  if (err.message === 'Email already exists' || err.message?.includes('Product with name')) {
    return res.status(409).json({ message: err.message });
  }

  if (err.message === 'Invalid credentials') {
    return res.status(401).json({ message: err.message });
  }

  if (err.message?.includes('not found')) {
    return res.status(404).json({ message: err.message });
  }

  if (err.message?.includes('Cannot cancel paid orders')) {
    return res.status(403).json({ message: err.message });
  }

  if (err.message?.includes('Insufficient stock') ||
      err.message?.includes('Product') ||
      err.message?.includes('quantity')) {
    return res.status(400).json({ message: err.message });
  }

  if (err.message?.includes('cancelled') || err.message?.includes('paid') || err.message?.includes('only')) {
    return res.status(409).json({ message: err.message });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
  });
};
