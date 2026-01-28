import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export enum OrderStatus {
  CREATED = 'created',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export interface IOrderItem {
  productId: string; // We store the productId (which is a UUID string from Product)
  quantity: number;
  unitPrice: number; // Stored at time of purchase
}

export interface IOrder extends Document {
  id: string; // UUID
  userId: string; // UUID of User
  items: IOrderItem[];
  total: number; // in cents
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema({
  productId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger } },
  unitPrice: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger } },
}, { _id: false });

const OrderSchema: Schema = new Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, ref: 'User' }, // Assuming we want reference, but it's UUID string. Mongoose population might need 'foreignField' if _id is not the match.
    // Note: Mongoose ref usually points to _id. User._id IS a string UUID in our schema.
    items: [OrderItemSchema],
    total: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger } },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.CREATED },
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

export const OrderModel = mongoose.model<IOrder>('Order', OrderSchema);

// Zod Schemas
export const OrderItemZodSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const CreateOrderZodSchema = z.object({
  items: z.array(OrderItemZodSchema).min(1),
});
