import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { CreateOrderZodSchema } from '../models/Order';
import { AuthRequest } from '../middleware/authMiddleware';

const orderService = new OrderService();

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('User not authenticated');

    const { items } = CreateOrderZodSchema.parse(req.body);
    const order = await orderService.createOrder({ userId: req.user.userId, items });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const orders = await orderService.getOrders(req.user.userId, req.user.role);
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const payOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const { id } = req.params as { id: string };
    const order = await orderService.payOrder(id, req.user.userId, req.user.role);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const { id } = req.params as { id: string };
    const order = await orderService.cancelOrder(id, req.user.userId, req.user.role);
    res.json(order);
  } catch (error) {
    next(error);
  }
};
