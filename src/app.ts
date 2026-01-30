import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorMiddleware';
import { authenticate, authorize } from './middleware/authMiddleware';
import * as authController from './controllers/authController';
import * as productController from './controllers/productController';
import * as orderController from './controllers/orderController';
import { UserRole } from './models/User';
import logger, { morganStream } from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: morganStream }));
app.use(express.json());

// Routes

// Auth
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);

// Products
app.post('/products', authenticate, authorize([UserRole.ADMIN]), productController.createProduct);
app.get('/products', productController.getProducts);
app.patch('/products/:id', authenticate, authorize([UserRole.ADMIN]), productController.updateProduct);

// Orders
app.post('/orders', authenticate, authorize([UserRole.CUSTOMER]), orderController.createOrder); // Only customers? Req says "customer create order". Admins usually can too, but let's stick to req.
app.get('/orders', authenticate, orderController.getOrders);
app.post('/orders/:id/pay', authenticate, orderController.payOrder);
app.post('/orders/:id/cancel', authenticate, orderController.cancelOrder);

// Error Handling
app.use(errorHandler);

export default app;
