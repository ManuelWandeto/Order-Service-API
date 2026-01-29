# Order Service API

A Node.js/Express TypeScript API implementing a strict Controller-Service-Repository pattern with MongoDB, JWT authentication, and transactional order processing.

## Features

- ✅ **Controller-Service-Repository Pattern** - Clean architecture with separation of concerns
- ✅ **MongoDB + Mongoose** - With ACID transactions for order processing
- ✅ **JWT Authentication** - Secure token-based auth with bcrypt password hashing
- ✅ **Role-Based Authorization** - Admin and Customer roles
- ✅ **Atomic Stock Management** - Race condition protection during order creation
- ✅ **TypeScript** - Full type safety with Zod validation
- ✅ **Docker Support** - Easy deployment with docker-compose
- ✅ **Integration Tests** - Using MongoMemoryReplSet

## Prerequisites

- Node.js 18+
- MongoDB 6+ (or use Docker)
- pnpm (or npm/yarn)

## Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

## Environment Variables

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/order-service
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

## Running the Application

### Development (with auto-reload)
```bash
pnpm dev
```

### Production
```bash
pnpm build
pnpm start
```

### With Docker
```bash
docker-compose up -d
```

## Database Seeding

Populate the database with sample data:

```bash
pnpm seed
```

**Default Credentials:**
- Admin: `admin@example.com` / `admin123`
- Customer: `customer1@example.com` / `customer123`

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Specific test file
pnpm test src/tests/order.test.ts
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Products
- `GET /products` - List all products
- `POST /products` - Create product (Admin only)
- `PATCH /products/:id` - Update product (Admin only)

### Orders
- `POST /orders` - Create order (Customer, transactional)
- `GET /orders` - List orders (own orders or all for Admin)
- `POST /orders/:id/pay` - Mark order as paid
- `POST /orders/:id/cancel` - Cancel order (restores stock)

## Architecture

```
src/
├── config/          # Database and environment configuration
├── controllers/     # HTTP request handlers
├── middleware/      # Auth, error handling
├── models/          # Mongoose schemas with Zod validation
├── repositories/    # Data access layer
├── services/        # Business logic
├── scripts/         # Utility scripts (seed, etc.)
├── tests/           # Integration tests
├── types/           # TypeScript type definitions
├── app.ts           # Express app setup
└── server.ts        # Entry point
```

## Key Implementation Details

### Transactions
Orders are created atomically using MongoDB sessions:
- Stock is decremented with race condition protection
- Order is created only if stock is available
- Transaction commits only if all steps succeed

### Stock Management
```typescript
const updatedProduct = await mongoose.model('Product').findOneAndUpdate(
  { _id: productId, stock: { $gte: quantity } },
  { $inc: { stock: -quantity } },
  { session, new: true }
);
```

### Authentication Flow
1. User registers/logs in → receives JWT
2. JWT included in `Authorization: Bearer <token>` header
3. Middleware verifies token and attaches user to request
4. Authorization middleware checks user role

## Development

```bash
# Format code
pnpm format

# Lint
pnpm lint

# Type check
pnpm type-check
```

## Deployment

1. Build the Docker image:
```bash
docker build -t order-service-api .
```

2. Run with docker-compose:
```bash
docker-compose up -d
```

3. The API will be available at `http://localhost:3000`

## License

ISC
