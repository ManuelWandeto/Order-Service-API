import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { UserModel, UserRole } from '../models/User';
import { ProductModel } from '../models/Product';
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

describe('Product API Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: UserRole.ADMIN,
    });
    adminToken = generateToken(admin.id, admin.role);

    const customer = await UserModel.create({
      email: 'customer@example.com',
      passwordHash: 'hash',
      role: UserRole.CUSTOMER,
    });
    customerToken = generateToken(customer.id, customer.role);
  });

  describe('POST /products', () => {
    it('should create a product as admin', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          price: 1999,
          stock: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Product');
      expect(res.body.price).toBe(1999);
      expect(res.body.stock).toBe(50);
      expect(res.body).toHaveProperty('id');
    });

    it('should return 403 when customer tries to create product', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test Product',
          price: 1999,
          stock: 50,
        });

      expect(res.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/products')
        .send({
          name: 'Test Product',
          price: 1999,
          stock: 50,
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
          price: -100,
          stock: -5,
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-integer price', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          price: 19.99,
          stock: 50,
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /products', () => {
    beforeEach(async () => {
      await ProductModel.create([
        { name: 'Product 1', price: 1000, stock: 10 },
        { name: 'Product 2', price: 2000, stock: 20 },
        { name: 'Product 3', price: 3000, stock: 30 },
      ]);
    });

    it('should get all products without authentication', async () => {
      const res = await request(app).get('/products');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('price');
      expect(res.body[0]).toHaveProperty('stock');
    });

    it('should return empty array when no products exist', async () => {
      await mongoose.connection.db?.dropDatabase();
      const res = await request(app).get('/products');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('PATCH /products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await ProductModel.create({
        name: 'Original Product',
        price: 1000,
        stock: 10,
      });
      productId = product.id;
    });

    it('should update product as admin', async () => {
      const res = await request(app)
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Product',
          price: 1500,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Product');
      expect(res.body.price).toBe(1500);
      expect(res.body.stock).toBe(10);
    });

    it('should update only stock', async () => {
      const res = await request(app)
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stock: 100,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Original Product');
      expect(res.body.stock).toBe(100);
    });

    it('should return 403 when customer tries to update product', async () => {
      const res = await request(app)
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          price: 2000,
        });

      expect(res.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .patch(`/products/${productId}`)
        .send({
          price: 2000,
        });

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .patch('/products/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 2000,
        });

      expect(res.status).toBe(404);
    });
  });
});
