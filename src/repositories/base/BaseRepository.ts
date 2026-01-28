import mongoose, { Model, Document, ClientSession } from 'mongoose';
import { IBaseRepository } from '../interfaces/IBaseRepository';

export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {
  constructor(protected readonly model: Model<T>) { }

  // Create a new document.
  // Supports sessions for transactions.
  async create(item: Partial<T>, session?: ClientSession): Promise<T> {
    const createdItem = new this.model(item);
    // save() returns a promise. Passing { session } ensures this operation is part of the transaction (if provided).
    return createdItem.save({ session });
  }

  async findById(id: string): Promise<T | null> {
    // findById is a convenience helper for findOne({ _id: id })
    return this.model.findById(id).exec();
  }

  async findAll(filter: any = {}): Promise<T[]> {
    return this.model.find(filter).exec();
  }

  async update(id: string, item: Partial<T>, session?: ClientSession): Promise<T | null> {
    // findByIdAndUpdate finds a matching document, updates it according to the update arg,
    // passing any options, and returns the found document (if any).
    // { new: true } returns the modified document rather than the original.
    // { session } binds this operation to the transaction.
    return this.model.findByIdAndUpdate(id, item, { new: true, session }).exec();
  }

  async delete(id: string, session?: ClientSession): Promise<boolean> {
    // findByIdAndDelete issues a mongodb findOneAndDelete command.
    const result = await this.model.findByIdAndDelete(id, { session }).exec();
    return !!result;
  }
}
