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
- ✅ **File Logging** - Winston-based logging with rotation and multiple transports

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
MONGO_URI=mongodb://localhost:27017/order-service?replicaSet=rs0
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

#### Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "customer@example.com",
    "role": "customer",
    "createdAt": "2026-01-29T10:30:00.000Z",
    "updatedAt": "2026-01-29T10:30:00.000Z"
  }
}
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "customer@example.com",
    "role": "customer"
  }
}
```

### Products

#### Get All Products
```bash
curl http://localhost:3000/products
```

**Response (200 OK):**
```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Wireless Mouse",
    "price": 2999,
    "stock": 50,
    "createdAt": "2026-01-29T10:35:00.000Z",
    "updatedAt": "2026-01-29T10:35:00.000Z"
  }
]
```

#### Create Product (Admin only)
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Wireless Mouse",
    "price": 2999,
    "stock": 50
  }'
```

**Note:** Price is in cents (2999 = $29.99)

**Response (201 Created):**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Wireless Mouse",
  "price": 2999,
  "stock": 50,
  "createdAt": "2026-01-29T10:35:00.000Z",
  "updatedAt": "2026-01-29T10:35:00.000Z"
}
```

#### Update Product (Admin only)
```bash
curl -X PATCH http://localhost:3000/products/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "price": 2499,
    "stock": 75
  }'
```

**Response (200 OK):**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Wireless Mouse",
  "price": 2499,
  "stock": 75,
  "updatedAt": "2026-01-29T10:40:00.000Z"
}
```

### Orders

#### Create Order (Customer only)
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -d '{
    "items": [
      {
        "productId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "quantity": 2
      },
      {
        "productId": "8d0f7780-8536-51ef-a055-f18gd2g01bf8",
        "quantity": 1
      }
    ]
  }'
```

**Response (201 Created):**
```json
{
  "id": "9e1g8891-9647-62fg-b166-g29he3h12cg9",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "productId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "quantity": 2,
      "unitPrice": 2999
    },
    {
      "productId": "8d0f7780-8536-51ef-a055-f18gd2g01bf8",
      "quantity": 1,
      "unitPrice": 12999
    }
  ],
  "total": 18997,
  "status": "created",
  "createdAt": "2026-01-29T10:45:00.000Z",
  "updatedAt": "2026-01-29T10:45:00.000Z"
}
```

#### Get Orders
```bash
# Customers see only their orders, admins see all orders
curl http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "id": "9e1g8891-9647-62fg-b166-g29he3h12cg9",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [...],
    "total": 5998,
    "status": "created",
    "createdAt": "2026-01-29T10:45:00.000Z",
    "updatedAt": "2026-01-29T10:45:00.000Z"
  }
]
```

#### Pay Order
```bash
curl -X POST http://localhost:3000/orders/9e1g8891-9647-62fg-b166-g29he3h12cg9/pay \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "id": "9e1g8891-9647-62fg-b166-g29he3h12cg9",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [...],
  "total": 5998,
  "status": "paid",
  "updatedAt": "2026-01-29T10:50:00.000Z"
}
```

**Note:** Idempotent - calling multiple times on already paid order returns 200 OK

#### Cancel Order
```bash
curl -X POST http://localhost:3000/orders/9e1g8891-9647-62fg-b166-g29he3h12cg9/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "id": "9e1g8891-9647-62fg-b166-g29he3h12cg9",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [...],
  "total": 5998,
  "status": "cancelled",
  "updatedAt": "2026-01-29T10:55:00.000Z"
}
```

**Note:** Idempotent - calling multiple times on already cancelled order returns 200 OK. Stock is restored atomically.

### Common Error Responses

**400 Bad Request (Validation Error):**
```json
{
  "message": "Validation Error",
  "errors": [
    {
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "message": "Access denied. No token provided."
}
```

**403 Forbidden:**
```json
{
  "message": "Access denied."
}
```

**404 Not Found:**
```json
{
  "message": "Product not found"
}
```

**409 Conflict:**
```json
{
  "message": "Email already exists"
}
```

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

## Logging

The application uses **Winston** for comprehensive logging with both console and file outputs.

### Log Files

Logs are written to the `/logs` directory:
- `combined.log` - All logs (info, warn, error, http)
- `error.log` - Error logs only

### Log Rotation
- Maximum file size: 5MB per file
- Maximum files kept: 5 (oldest automatically deleted)

### Logged Events
- HTTP requests (method, URL, status, response time)
- User registration and login
- Order creation, payment, and cancellation
- Database connection events
- All errors with stack traces

### Viewing Logs

```bash
# Tail all logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# Search for specific events
grep "Order created" logs/combined.log
```

See [LOGGING.md](./LOGGING.md) for detailed logging documentation.

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
