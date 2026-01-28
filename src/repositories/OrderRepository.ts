import { BaseRepository } from './base/BaseRepository';
import { IOrder, OrderModel } from '../models/Order';

export class OrderRepository extends BaseRepository<IOrder> {
  constructor() {
    super(OrderModel);
  }

  async findByUserId(userId: string): Promise<IOrder[]> {
    return this.model.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
