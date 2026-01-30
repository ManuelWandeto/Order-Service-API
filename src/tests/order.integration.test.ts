import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { UserModel, UserRole } from '../models/User';
import { ProductModel } from '../models/Product';
import { OrderModel, OrderStatus } from '../models/Order';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

const generateToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Order API Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let customerId: string;
  let adminId: string;
  let product1Id: string;
  let product2Id: string;

  beforeEach(async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: UserRole.ADMIN,
    });
    adminId = admin.id;
    adminToken = generateToken(admin.id, admin.role);

    const customer = await UserModel.create({
      email: 'customer@example.com',
      passwordHash: 'hash',
      role: UserRole.CUSTOMER,
    });
    customerId = customer.id;
    customerToken = generateToken(customer.id, customer.role);

    const product1 = await ProductModel.create({
      name: 'Product 1',
      price: 1000,
      stock: 100,
    });
    product1Id = product1.id;

    const product2 = await ProductModel.create({
      name: 'Product 2',
      price: 2000,
      stock: 50,
    });
    product2Id = product2.id;
  });

  describe('POST /orders', () => {
    it('should create an order successfully', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            { productId: product1Id, quantity: 2 },
            { productId: product2Id, quantity: 1 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(customerId);
      expect(res.body.total).toBe(4000);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.status).toBe(OrderStatus.CREATED);

      const product1 = await ProductModel.findById(product1Id);
      const product2 = await ProductModel.findById(product2Id);
      expect(product1?.stock).toBe(98);
      expect(product2?.stock).toBe(49);
    });

    it('should return 403 when admin tries to create order', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/orders')
        .send({
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 for non-existent product', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: 'non-existent-id', quantity: 1 }],
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for insufficient stock', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product1Id, quantity: 200 }],
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 with detailed validation errors for invalid quantity', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product1Id, quantity: 0 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors[0]).toHaveProperty('path');
      expect(res.body.errors[0]).toHaveProperty('message');
      expect(res.body.errors[0].path).toContain('quantity');
    });

    it('should return 400 with detailed validation errors for negative quantity', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product1Id, quantity: -5 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0]).toHaveProperty('path');
      expect(res.body.errors[0]).toHaveProperty('message');
    });

    it('should return 400 with detailed validation errors for empty items array', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0]).toHaveProperty('path');
      expect(res.body.errors[0]).toHaveProperty('message');
      expect(res.body.errors[0].path).toContain('items');
    });

    it('should return 400 with detailed validation errors for invalid productId format', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: 'not-a-uuid', quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0]).toHaveProperty('path');
      expect(res.body.errors[0].path).toContain('productId');
    });

    it('should capture unit price at time of order', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.items[0].unitPrice).toBe(1000);

      await ProductModel.findByIdAndUpdate(product1Id, { price: 1500 });

      const order = await OrderModel.findById(res.body.id);
      expect(order?.items[0].unitPrice).toBe(1000);
    });
  });

  describe('GET /orders', () => {
    let customerOrder1Id: string;
    let customerOrder2Id: string;
    let otherCustomerOrderId: string;

    beforeEach(async () => {
      const order1 = await OrderModel.create({
        userId: customerId,
        items: [{ productId: product1Id, quantity: 1, unitPrice: 1000 }],
        total: 1000,
        status: OrderStatus.CREATED,
      });
      customerOrder1Id = order1.id;

      const order2 = await OrderModel.create({
        userId: customerId,
        items: [{ productId: product2Id, quantity: 2, unitPrice: 2000 }],
        total: 4000,
        status: OrderStatus.PAID,
      });
      customerOrder2Id = order2.id;

      const otherCustomer = await UserModel.create({
        email: 'other@example.com',
        passwordHash: 'hash',
        role: UserRole.CUSTOMER,
      });

      const order3 = await OrderModel.create({
        userId: otherCustomer.id,
        items: [{ productId: product1Id, quantity: 1, unitPrice: 1000 }],
        total: 1000,
        status: OrderStatus.CREATED,
      });
      otherCustomerOrderId = order3.id;
    });

    it('should get only customer own orders', async () => {
      const res = await request(app)
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((order: any) => order.userId === customerId)).toBe(true);
    });

    it('should get all orders as admin', async () => {
      const res = await request(app)
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/orders');

      expect(res.status).toBe(401);
    });

    it('should return empty array when customer has no orders', async () => {
      const newCustomer = await UserModel.create({
        email: 'newcustomer@example.com',
        passwordHash: 'hash',
        role: UserRole.CUSTOMER,
      });
      const newToken = generateToken(newCustomer.id, newCustomer.role);

      const res = await request(app)
        .get('/orders')
        .set('Authorization', `Bearer ${newToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /orders/:id/pay', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = await OrderModel.create({
        userId: customerId,
        items: [{ productId: product1Id, quantity: 1, unitPrice: 1000 }],
        total: 1000,
        status: OrderStatus.CREATED,
      });
      orderId = order.id;
    });

    it('should pay an order successfully', async () => {
      const res = await request(app)
        .post(`/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.PAID);
      expect(res.body.id).toBe(orderId);
    });

    it('should be idempotent - paying already paid order', async () => {
      await OrderModel.findByIdAndUpdate(orderId, { status: OrderStatus.PAID });

      const res = await request(app)
        .post(`/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.PAID);
    });

    it('should return 409 when trying to pay cancelled order', async () => {
      await OrderModel.findByIdAndUpdate(orderId, { status: OrderStatus.CANCELLED });

      const res = await request(app)
        .post(`/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(409);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .post('/orders/non-existent-id/pay')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).post(`/orders/${orderId}/pay`);

      expect(res.status).toBe(401);
    });

    it('should return 409 when customer tries to pay another customer order', async () => {
      const otherCustomer = await UserModel.create({
        email: 'other@example.com',
        passwordHash: 'hash',
        role: UserRole.CUSTOMER,
      });
      const otherToken = generateToken(otherCustomer.id, otherCustomer.role);

      const res = await request(app)
        .post(`/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('your own orders');
    });

    it('should allow admin to pay any order', async () => {
      const res = await request(app)
        .post(`/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.PAID);
    });
  });

  describe('POST /orders/:id/cancel', () => {
    let orderId: string;

    beforeEach(async () => {
      await ProductModel.findByIdAndUpdate(product1Id, { stock: 100 });

      const order = await OrderModel.create({
        userId: customerId,
        items: [
          { productId: product1Id, quantity: 5, unitPrice: 1000 },
          { productId: product2Id, quantity: 2, unitPrice: 2000 },
        ],
        total: 9000,
        status: OrderStatus.CREATED,
      });
      orderId = order.id;

      await ProductModel.findByIdAndUpdate(product1Id, { stock: 95 });
      await ProductModel.findByIdAndUpdate(product2Id, { stock: 48 });
    });

    it('should cancel an order and restore stock', async () => {
      const res = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.CANCELLED);

      const product1 = await ProductModel.findById(product1Id);
      const product2 = await ProductModel.findById(product2Id);
      expect(product1?.stock).toBe(100);
      expect(product2?.stock).toBe(50);
    });

    it('should be idempotent - cancelling already cancelled order', async () => {
      await OrderModel.findByIdAndUpdate(orderId, { status: OrderStatus.CANCELLED });

      const res = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.CANCELLED);

      const product1 = await ProductModel.findById(product1Id);
      expect(product1?.stock).toBe(95);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .post('/orders/non-existent-id/cancel')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).post(`/orders/${orderId}/cancel`);

      expect(res.status).toBe(401);
    });

    it('should return 409 when customer tries to cancel another customer order', async () => {
      const otherCustomer = await UserModel.create({
        email: 'other@example.com',
        passwordHash: 'hash',
        role: UserRole.CUSTOMER,
      });
      const otherToken = generateToken(otherCustomer.id, otherCustomer.role);

      const res = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('your own orders');
    });

    it('should return 403 when customer tries to cancel paid order', async () => {
      await OrderModel.findByIdAndUpdate(orderId, { status: OrderStatus.PAID });

      const res = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cannot cancel paid orders');
    });

    it('should allow admin to cancel paid order', async () => {
      await OrderModel.findByIdAndUpdate(orderId, { status: OrderStatus.PAID });

      const res = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.CANCELLED);

      const product1 = await ProductModel.findById(product1Id);
      const product2 = await ProductModel.findById(product2Id);
      expect(product1?.stock).toBe(100);
      expect(product2?.stock).toBe(50);
    });

    it('should allow admin to cancel any customer order', async () => {
      const res = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
