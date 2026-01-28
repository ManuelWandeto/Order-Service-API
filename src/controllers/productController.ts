import { Request, Response, NextFunction } from 'express';
import { ProductRepository } from '../repositories/ProductRepository';
import { ProductZodSchema } from '../models/Product';
import { z } from 'zod';

const productRepo = new ProductRepository();

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = ProductZodSchema.parse(req.body);
    const product = await productRepo.create(data);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productRepo.findAll();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = ProductZodSchema.partial().parse(req.body); // Allow partial updates
    const product = await productRepo.update(id, data);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};
