import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { UserRole } from '../models/User';
import { ProductModel } from '../models/Product';
import { UserModel } from '../models/User';
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

describe('Order Integration Tests', () => {
  it('should create an order successfully', async () => {
    // 1. Create User
    const user = await UserModel.create({
      email: 'test@example.com',
      passwordHash: 'hash',
      role: UserRole.CUSTOMER
    });
    const token = generateToken(user.id, user.role);

    // 2. Create Product
    const product = await ProductModel.create({
      name: 'Test Product',
      price: 1000,
      stock: 10
    });

    // 3. Create Order
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { productId: product._id, quantity: 2 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(2000);
    expect(res.body.items).toHaveLength(1);

    // Verify Stock Decrement
    const updatedProduct = await ProductModel.findById(product._id);
    expect(updatedProduct?.stock).toBe(8);
  });

  it('should fail if stock is insufficient', async () => {
    const user = await UserModel.create({
      email: 'test2@example.com',
      passwordHash: 'hash',
      role: UserRole.CUSTOMER
    });
    const token = generateToken(user.id, user.role);

    const product = await ProductModel.create({
      name: 'Low Stock Product',
      price: 1000,
      stock: 1
    });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { productId: product._id, quantity: 2 }
        ]
      });

    expect(res.status).toBe(500); // Service throws Error, middleware makes it 500. Could be 400 if we handled it better.
    expect(res.body.message).toContain('Insufficient stock');
  });
});
