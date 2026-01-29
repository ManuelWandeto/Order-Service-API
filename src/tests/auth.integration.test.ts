import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { UserModel } from '../models/User';

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

describe('Auth API Integration Tests', () => {
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user.role).toBe('customer');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 409 when email already exists', async () => {
      await UserModel.create({
        email: 'existing@example.com',
        passwordHash: 'hash',
        role: 'customer',
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Email already exists');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for password less than 6 characters', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '12345',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'loginuser@example.com',
          password: 'password123',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('loginuser@example.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid credentials');
    });
  });
});
