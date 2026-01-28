import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err.message);

  // Custom parsing can be added here (e.g., ZodError, Mongoose ValidationError)
  if (err.name === 'ZodError') {
    return res.status(400).json({ message: 'Validation Error', errors: err.errors });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
  });
};
