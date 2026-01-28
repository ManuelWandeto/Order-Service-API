import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export interface IProduct extends Document {
  id: string;
  name: string;
  price: number; // in cents
  stock: number;
  createdAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    price: { type: Number, required: true, validate: { validator: Number.isInteger, message: 'Price must be an integer (cents)' } },
    stock: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'Stock must be an integer' } },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);

export const ProductZodSchema = z.object({
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
});
