import mongoose, { ClientSession } from 'mongoose';
import { ProductRepository } from '../repositories/ProductRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { IOrder, OrderStatus } from '../models/Order';
import { IProduct } from '../models/Product';

interface CreateOrderParams {
  userId: string;
  items: { productId: string; quantity: number }[];
}

export class OrderService {
  private productRepo: ProductRepository;
  private orderRepo: OrderRepository;

  constructor() {
    this.productRepo = new ProductRepository();
    this.orderRepo = new OrderRepository();
  }

  /**
   * Creates an order transactionally.
   * 1. Start Session
   * 2. Fetch products and validate stock
   * 3. Calculate total
   * 4. Decrement stock
   * 5. Create Order
   * 6. Commit or Abort
   */
  async createOrder(params: CreateOrderParams): Promise<IOrder> {
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      let total = 0;
      const orderItems = [];

      for (const item of params.items) {
        // Find product. Using session not strictly necessary for read unless we want repeatable read,
        // but for stock check, we generally want fresh data.
        // However, to lock the document or ensure atomicity, findAndUpdate is better or we just rely on optimistic concurrency via versioning if using save().
        // Here we will use findByIdAndUpdate to atomically decrement stock later, but first we need to get price.

        const product = await this.productRepo.findById(item.productId); // Just reading price.

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }

        total += product.price * item.quantity;
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
        });

        // Decrement stock within transaction
        // We use $inc: { stock: -quantity } AND a generic query filter stock: { $gte: quantity } to ensure we don't go negative even with race conditions.
        // Wait, Mongoose findByIdAndUpdate doesn't allow arbitrary filters easily in the 'id' arg, but 'findOneAndUpdate' does.
        // But since we are in a transaction (serializable snapshot isolation usually with Mongo standard), we might be safe.
        // Best practice: Atomic update with condition.

        const updatedProduct = await mongoose.model('Product').findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session, new: true }
        );

        if (!updatedProduct) {
          throw new Error(`Insufficient stock for product ${product.name} (race condition)`);
        }
      }

      // Create Order
      const order = await this.orderRepo.create(
        {
          userId: params.userId,
          items: orderItems,
          total,
          status: OrderStatus.CREATED,
        },
        session
      );

      await session.commitTransaction();
      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getOrders(userId: string, role: string): Promise<IOrder[]> {
    if (role === 'admin') {
      return this.orderRepo.findAll();
    }
    return this.orderRepo.findByUserId(userId);
  }

  async payOrder(orderId: string, userId: string): Promise<IOrder> {
    // Idempotent: if already paid, return it.
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new Error('Order not found');

    // Check ownership if not admin (logic can be in controller, but service is safer)
    // For now assuming controller checks ownership or passes safe params.

    if (order.status === OrderStatus.PAID) return order;
    if (order.status === OrderStatus.CANCELLED) throw new Error('Order is cancelled');

    // Update status
    const updatedOrder = await this.orderRepo.update(orderId, { status: OrderStatus.PAID });
    if (!updatedOrder) throw new Error('Failed to update order');
    return updatedOrder;
  }

  async cancelOrder(orderId: string): Promise<IOrder> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await this.orderRepo.findById(orderId);
      if (!order) throw new Error('Order not found');

      if (order.status === OrderStatus.CANCELLED) {
        await session.abortTransaction(); // or commit nothing
        return order;
      }

      // If paid, allow cancel? Req says "if paid -> either 409 or allow".
      // I'll allow it but Refund logic is out of scope, just restore stock.

      // Restore stock
      for (const item of order.items) {
        await mongoose.model('Product').findOneAndUpdate(
          { _id: item.productId },
          { $inc: { stock: item.quantity } },
          { session }
        );
      }

      const updatedOrder = await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED }, session);
      if (!updatedOrder) throw new Error('Failed to update order');

      await session.commitTransaction();
      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
