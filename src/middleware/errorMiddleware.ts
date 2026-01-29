import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err.message);

  // Custom parsing can be added here (e.g., ZodError, Mongoose ValidationError)
  if (err.name === 'ZodError') {
    return res.status(400).json({ message: 'Validation Error', errors: err.errors });
  }

  // Map specific error messages to status codes
  if (err.message === 'Email already exists') {
    return res.status(409).json({ message: err.message });
  }

  if (err.message === 'Invalid credentials') {
    return res.status(401).json({ message: err.message });
  }

  if (err.message?.includes('not found')) {
    return res.status(404).json({ message: err.message });
  }

  if (err.message?.includes('Insufficient stock') ||
      err.message?.includes('Product') ||
      err.message?.includes('quantity')) {
    return res.status(400).json({ message: err.message });
  }

  if (err.message?.includes('cancelled') || err.message?.includes('paid')) {
    return res.status(409).json({ message: err.message });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
  });
};
