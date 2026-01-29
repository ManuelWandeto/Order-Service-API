import mongoose from 'mongoose';
import { OrderService } from '../services/OrderService';
import { ProductRepository } from '../repositories/ProductRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderStatus } from '../models/Order';

// Mock dependencies
jest.mock('../repositories/ProductRepository');
jest.mock('../repositories/OrderRepository');
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  startSession: jest.fn(),
  model: jest.fn(),
}));

describe('OrderService', () => {
  let orderService: OrderService;
  let mockProductRepo: jest.Mocked<ProductRepository>;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);

    orderService = new OrderService();
    mockProductRepo = (orderService as any).productRepo;
    mockOrderRepo = (orderService as any).orderRepo;
  });

  describe('createOrder', () => {
    const userId = 'user-uuid-123';
    const productId1 = 'product-uuid-1';
    const productId2 = 'product-uuid-2';

    const mockProduct1 = {
      id: productId1,
      name: 'Product 1',
      price: 1000, // $10.00
      stock: 10,
    };

    const mockProduct2 = {
      id: productId2,
      name: 'Product 2',
      price: 2000, // $20.00
      stock: 5,
    };

    it('should successfully create an order with multiple items', async () => {
      const items = [
        { productId: productId1, quantity: 2 },
        { productId: productId2, quantity: 1 },
      ];

      const expectedOrder = {
        id: 'order-uuid-123',
        userId,
        items: [
          { productId: productId1, quantity: 2, unitPrice: 1000 },
          { productId: productId2, quantity: 1, unitPrice: 2000 },
        ],
        total: 4000, // (1000 * 2) + (2000 * 1)
        status: OrderStatus.CREATED,
      };

      mockProductRepo.findById
        .mockResolvedValueOnce(mockProduct1 as any)
        .mockResolvedValueOnce(mockProduct2 as any);

      const mockProductModel = {
        findOneAndUpdate: jest.fn()
          .mockResolvedValueOnce({ ...mockProduct1, stock: 8 })
          .mockResolvedValueOnce({ ...mockProduct2, stock: 4 }),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockProductModel);

      mockOrderRepo.create.mockResolvedValue(expectedOrder as any);

      const result = await orderService.createOrder({ userId, items });

      expect(mockProductRepo.findById).toHaveBeenCalledTimes(2);
      expect(mockProductModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(mockProductModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: productId1, stock: { $gte: 2 } },
        { $inc: { stock: -2 } },
        { session: mockSession, new: true }
      );
      expect(mockOrderRepo.create).toHaveBeenCalledWith(
        {
          userId,
          items: [
            { productId: productId1, quantity: 2, unitPrice: 1000 },
            { productId: productId2, quantity: 1, unitPrice: 2000 },
          ],
          total: 4000,
          status: OrderStatus.CREATED,
        },
        mockSession
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toEqual(expectedOrder);
    });

    it('should throw error if product not found', async () => {
      const items = [{ productId: productId1, quantity: 2 }];

      mockProductRepo.findById.mockResolvedValue(null);

      await expect(orderService.createOrder({ userId, items })).rejects.toThrow(
        `Product ${productId1} not found`
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockOrderRepo.create).not.toHaveBeenCalled();
    });

    it('should throw error if insufficient stock', async () => {
      const items = [{ productId: productId1, quantity: 20 }];

      mockProductRepo.findById.mockResolvedValue(mockProduct1 as any);

      await expect(orderService.createOrder({ userId, items })).rejects.toThrow(
        `Insufficient stock for product ${mockProduct1.name}`
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockOrderRepo.create).not.toHaveBeenCalled();
    });

    it('should handle race condition when stock becomes insufficient', async () => {
      const items = [{ productId: productId1, quantity: 2 }];

      mockProductRepo.findById.mockResolvedValue(mockProduct1 as any);

      const mockProductModel = {
        findOneAndUpdate: jest.fn().mockResolvedValue(null), // Race condition: stock depleted
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockProductModel);

      await expect(orderService.createOrder({ userId, items })).rejects.toThrow(
        `Insufficient stock for product ${mockProduct1.name} (race condition)`
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockOrderRepo.create).not.toHaveBeenCalled();
    });

    it('should calculate total correctly for multiple items', async () => {
      const items = [
        { productId: productId1, quantity: 3 },
        { productId: productId2, quantity: 2 },
      ];

      mockProductRepo.findById
        .mockResolvedValueOnce(mockProduct1 as any)
        .mockResolvedValueOnce(mockProduct2 as any);

      const mockProductModel = {
        findOneAndUpdate: jest.fn()
          .mockResolvedValueOnce({ ...mockProduct1, stock: 7 })
          .mockResolvedValueOnce({ ...mockProduct2, stock: 3 }),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockProductModel);

      const expectedOrder = {
        id: 'order-uuid-123',
        userId,
        items: [
          { productId: productId1, quantity: 3, unitPrice: 1000 },
          { productId: productId2, quantity: 2, unitPrice: 2000 },
        ],
        total: 7000, // (1000 * 3) + (2000 * 2)
        status: OrderStatus.CREATED,
      };

      mockOrderRepo.create.mockResolvedValue(expectedOrder as any);

      const result = await orderService.createOrder({ userId, items });

      expect(mockOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ total: 7000 }),
        mockSession
      );
      expect(result.total).toBe(7000);
    });
  });

  describe('getOrders', () => {
    const userId = 'user-uuid-123';

    it('should return all orders for admin', async () => {
      const mockOrders = [
        { id: 'order-1', userId: 'user-1', total: 1000 },
        { id: 'order-2', userId: 'user-2', total: 2000 },
      ];

      mockOrderRepo.findAll.mockResolvedValue(mockOrders as any);

      const result = await orderService.getOrders(userId, 'admin');

      expect(mockOrderRepo.findAll).toHaveBeenCalled();
      expect(mockOrderRepo.findByUserId).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });

    it('should return only user orders for customer', async () => {
      const mockOrders = [
        { id: 'order-1', userId, total: 1000 },
        { id: 'order-2', userId, total: 2000 },
      ];

      mockOrderRepo.findByUserId.mockResolvedValue(mockOrders as any);

      const result = await orderService.getOrders(userId, 'customer');

      expect(mockOrderRepo.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockOrderRepo.findAll).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });
  });

  describe('payOrder', () => {
    const orderId = 'order-uuid-123';
    const userId = 'user-uuid-123';

    it('should successfully pay an order', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.CREATED,
        total: 1000,
      };

      const updatedOrder = {
        ...mockOrder,
        status: OrderStatus.PAID,
      };

      mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
      mockOrderRepo.update.mockResolvedValue(updatedOrder as any);

      const result = await orderService.payOrder(orderId, userId);

      expect(mockOrderRepo.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepo.update).toHaveBeenCalledWith(orderId, { status: OrderStatus.PAID });
      expect(result).toEqual(updatedOrder);
    });

    it('should be idempotent - return order if already paid', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.PAID,
        total: 1000,
      };

      mockOrderRepo.findById.mockResolvedValue(mockOrder as any);

      const result = await orderService.payOrder(orderId, userId);

      expect(mockOrderRepo.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });

    it('should throw error if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      await expect(orderService.payOrder(orderId, userId)).rejects.toThrow('Order not found');
      expect(mockOrderRepo.update).not.toHaveBeenCalled();
    });

    it('should throw error if order is cancelled', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.CANCELLED,
        total: 1000,
      };

      mockOrderRepo.findById.mockResolvedValue(mockOrder as any);

      await expect(orderService.payOrder(orderId, userId)).rejects.toThrow('Order is cancelled');
      expect(mockOrderRepo.update).not.toHaveBeenCalled();
    });

    it('should throw error if update fails', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.CREATED,
        total: 1000,
      };

      mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
      mockOrderRepo.update.mockResolvedValue(null);

      await expect(orderService.payOrder(orderId, userId)).rejects.toThrow('Failed to update order');
    });
  });

  describe('cancelOrder', () => {
    const orderId = 'order-uuid-123';
    const userId = 'user-uuid-123';
    const productId1 = 'product-uuid-1';
    const productId2 = 'product-uuid-2';

    it('should successfully cancel an order and restore stock', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.CREATED,
        items: [
          { productId: productId1, quantity: 2, unitPrice: 1000 },
          { productId: productId2, quantity: 1, unitPrice: 2000 },
        ],
        total: 4000,
      };

      const updatedOrder = {
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      };

      mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
      mockOrderRepo.update.mockResolvedValue(updatedOrder as any);

      const mockProductModel = {
        findOneAndUpdate: jest.fn()
          .mockResolvedValueOnce({ id: productId1, stock: 12 })
          .mockResolvedValueOnce({ id: productId2, stock: 6 }),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockProductModel);

      const result = await orderService.cancelOrder(orderId);

      expect(mockOrderRepo.findById).toHaveBeenCalledWith(orderId);
      expect(mockProductModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(mockProductModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: productId1 },
        { $inc: { stock: 2 } },
        { session: mockSession }
      );
      expect(mockProductModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: productId2 },
        { $inc: { stock: 1 } },
        { session: mockSession }
      );
      expect(mockOrderRepo.update).toHaveBeenCalledWith(
        orderId,
        { status: OrderStatus.CANCELLED },
        mockSession
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toEqual(updatedOrder);
    });

    it('should be idempotent - return order if already cancelled', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.CANCELLED,
        items: [],
        total: 1000,
      };

      mockOrderRepo.findById.mockResolvedValue(mockOrder as any);

      const result = await orderService.cancelOrder(orderId);

      expect(mockOrderRepo.findById).toHaveBeenCalledWith(orderId);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockOrderRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });

    it('should throw error if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      await expect(orderService.cancelOrder(orderId)).rejects.toThrow('Order not found');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should rollback transaction if stock restoration fails', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.CREATED,
        items: [{ productId: productId1, quantity: 2, unitPrice: 1000 }],
        total: 2000,
      };

      mockOrderRepo.findById.mockResolvedValue(mockOrder as any);

      const mockProductModel = {
        findOneAndUpdate: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockProductModel);

      await expect(orderService.cancelOrder(orderId)).rejects.toThrow('Database error');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw error if order update fails', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.CREATED,
        items: [{ productId: productId1, quantity: 2, unitPrice: 1000 }],
        total: 2000,
      };

      mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
      mockOrderRepo.update.mockResolvedValue(null);

      const mockProductModel = {
        findOneAndUpdate: jest.fn().mockResolvedValue({ id: productId1, stock: 12 }),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockProductModel);

      await expect(orderService.cancelOrder(orderId)).rejects.toThrow('Failed to update order');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
