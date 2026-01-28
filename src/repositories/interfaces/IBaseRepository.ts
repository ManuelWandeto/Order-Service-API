import { ClientSession } from 'mongoose';

export interface IBaseRepository<T> {
  create(item: Partial<T>, session?: ClientSession): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(filter?: any): Promise<T[]>;
  update(id: string, item: Partial<T>, session?: ClientSession): Promise<T | null>;
  delete(id: string, session?: ClientSession): Promise<boolean>;
}
