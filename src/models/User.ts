import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

export interface IUser extends Document {
  id: string; // UUID
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    _id: { type: String, default: uuidv4 }, // Use Query-friendly UUID string
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash; // Don't expose password hash
      },
    },
  }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);

// Zod Schema for Validation
export const UserZodSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6), // We validate 'password' in input, but store 'passwordHash'
  role: z.nativeEnum(UserRole).optional(),
});
