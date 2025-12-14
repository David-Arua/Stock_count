# Farmer-Vendor Marketplace Backend

Node.js/Express backend API for the Farmer-Vendor Marketplace.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server (development with auto-reload):
```bash
npm run dev
```

Or production:
```bash
npm start
```

The server runs on `http://localhost:5000`

## API Endpoints

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/:id` - Get user by ID
- `GET /api/users` - Get all users

### Products
- `GET /api/products` - Get all products (with optional `farmerId` and `search` filters)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Add new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Requests
- `GET /api/requests` - Get requests (with optional `farmerId` or `vendorId` filter)
- `POST /api/requests` - Create purchase request
- `PATCH /api/requests/:id` - Update request status

### Messages
- `GET /api/messages` - Get messages between two users (requires `userId1` and `userId2` query params)
- `GET /api/messages/conversations/:userId` - Get user's conversation list
- `POST /api/messages` - Send message

## Database

MySQL is used. Configure via `.env`:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

Tables created on startup: users, products, requests, messages. Indexes cover common queries, and a FULLTEXT index on `products(name, description)` is created if supported by your MySQL version.

## Environment

Default port: 5000 (set `PORT` environment variable to override)
