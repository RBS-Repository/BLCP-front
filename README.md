# BLCP Application Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Security Features](#security-features)
3. [Installation and Setup](#installation-and-setup)
4. [Authentication System](#authentication-system)
5. [User Management](#user-management)
6. [Payment Processing](#payment-processing)
7. [API Reference](#api-reference)
8. [Environment Configuration](#environment-configuration)
9. [Deployment Guidelines](#deployment-guidelines)
10. [Security Best Practices](#security-best-practices)

## System Overview

BLCP is a full-stack e-commerce application built with:
- **Frontend**: React, TailwindCSS
- **Backend**: Express.js, Node.js
- **Database**: MongoDB, Firebase Firestore
- **Authentication**: Firebase Auth, JWT

The system includes product management, user authentication, cart functionality, order processing, payment integration with PayMongo, and analytics.

## Security Features

The application implements several security measures:

### Authentication and Authorization
- Multi-layer authentication via Firebase Auth and JWT fallback
- Role-based access control (RBAC) for admin functions
- Token expiration and secure validation

### Data Protection
- Environment variable management for secrets
- Encrypted JWT tokens
- Input validation using express-validator

### API Security
- Request rate limiting on sensitive endpoints
- CORS protection configured per environment
- Webhook signature verification for payment processing

### Web Security Headers
- XSS protection headers
- Content-Type security headers
- Clickjacking prevention

## Installation and Setup

### Prerequisites
- Node.js (v14+)
- MongoDB
- Firebase account
- PayMongo account (for payment processing)

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd blcp
   ```

2. Install dependencies:
   ```bash
   npm install
   # or using pnpm
   pnpm install
   ```

3. Create environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required values

4. Run the development server:
   ```bash
   # Run frontend
   npm run dev

   # Run backend
   npm run dev:server

   # Run both concurrently
   npm run dev:all
   ```

## Authentication System

The application uses a dual authentication system:

### Firebase Authentication
- Primary authentication method
- Handles user registration, login, and session management
- Custom claims for role-based access

### JWT Authentication (Fallback)
- Secondary authentication method
- Used for services without Firebase integration
- Configured with secure algorithm and expiration

### Authentication Flow
1. User logs in through Firebase Auth
2. Firebase token is stored client-side
3. Token is sent in Authorization header
4. Server validates token through middleware
5. User data and permissions are attached to the request

### Implementing Protected Routes

```javascript
// Client-side route protection
<Route 
  path="/protected-route" 
  element={
    <ProtectedRoute>
      <ProtectedComponent />
    </ProtectedRoute>
  } 
/>

// Server-side route protection
router.get('/protected-endpoint', auth, (req, res) => {
  // Only authenticated users can access
});

// Admin-only route protection
router.get('/admin-endpoint', auth, adminOnly, (req, res) => {
  // Only admin users can access
});
```

## User Management

### User Roles
- **Regular Users**: Can browse products, manage their cart, place orders
- **Admin Users**: Can manage products, view analytics, manage users

### User Operations
- **Registration**: Users can create accounts with email/password
- **Authentication**: Login using Firebase Auth
- **Profile Management**: Users can update their profile information
- **Account Status**: Admins can activate/deactivate user accounts

### Admin User Management

Admins can:
- View all users
- Change user roles (promote to admin or demote)
- Deactivate user accounts
- Delete user accounts (with associated data cleanup)

## Payment Processing

The system integrates with PayMongo for payment processing.

### Payment Methods
- Credit/Debit Cards
- GCash
- GrabPay
- Maya (PayMaya)

### Payment Flow
1. User places an order
2. System creates a payment source or checkout session
3. User is redirected to payment gateway
4. After payment, webhook notifies the system
5. Order status is updated based on payment result

### Webhook Security
- All webhooks are verified using HMAC signatures
- Rate limiting is applied to prevent abuse
- Transactions are logged for audit purposes

### Implementing Payments

```javascript
// Create a payment source
const source = await paymongoService.createSource({
  amount: orderTotal,
  type: 'gcash', // or 'grab_pay', 'maya'
  currency: 'PHP',
  redirect: {
    success: 'https://yourdomain.com/payment/success',
    failed: 'https://yourdomain.com/payment/failed'
  },
  metadata: {
    order_id: orderId
  }
});

// Redirect user to checkout URL
window.location.href = source.attributes.redirect.checkout_url;
```

## API Reference

### Authentication Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/users/login` | POST | Login with email/password | None |
| `/api/users/check-admin` | GET | Check admin status | User |

### Product Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/products` | GET | Get all products | None |
| `/api/products/:id` | GET | Get product details | None |
| `/api/products` | POST | Create product | Admin |
| `/api/products/:id` | PUT | Update product | Admin |
| `/api/products/:id` | DELETE | Delete product | Admin |

### Order Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/orders` | POST | Create order | User |
| `/api/orders/:id` | GET | Get order details | User (own order) / Admin (any) |
| `/api/orders/:id/status` | PATCH | Update order status | Admin |

### Payment Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/payments/source` | POST | Create payment source | User |
| `/api/payments/webhook` | POST | Payment webhook | None (w/ signature) |
| `/api/payments/status/:orderId` | GET | Check payment status | User |

### User Management Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/users/:id` | DELETE | Delete user | Admin |
| `/api/users/:id/role` | PATCH | Update user role | Admin |
| `/api/users/:id/status` | PATCH | Update user status | Admin |

## Environment Configuration

The application uses environment variables for configuration. Create a `.env` file based on `.env.example`.

### Required Variables

#### Firebase Configuration
```plaintext
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin SDK
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
```

#### MongoDB Configuration
```plaintext
MONGO_URI=mongodb://localhost:27017/my-app
```

#### PayMongo Configuration
```plaintext
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_PUBLIC_KEY=your_paymongo_public_key
PAYMONGO_WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_URL=your_webhook_url
```

#### Security Configuration
```plaintext
JWT_SECRET=your_generated_jwt_secret
```

#### Server Configuration
```plaintext
PORT=5000
NODE_ENV=production
```

## Deployment Guidelines

### Preparing for Production

1. Set environment variables:
   - Ensure all required environment variables are set
   - Use production values for Firebase, MongoDB, etc.
   - Set NODE_ENV to 'production'

2. Build the frontend:
   ```bash
   npm run build
   ```

3. Deploy backend:
   - Use a process manager like PM2 for Node.js services
   - Set up reverse proxy with Nginx or similar
   - Configure SSL certificates

### Deployment with Vercel

This application is configured for deployment with Vercel:

1. Push code to your GitHub repository
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy from the main branch

### Monitoring and Logging

- Implement centralized logging
- Set up monitoring for application health
- Configure alerts for critical errors

## Security Best Practices

### Credential Management
- NEVER commit secrets to the repository
- Store all sensitive information in environment variables
- Rotate secrets periodically
- Use different secrets for development and production

### Code Security
- Keep dependencies updated
- Run security scans regularly
- Implement proper input validation
- Use parameterized queries for database operations

### Authentication Security
- Enforce strong password policies
- Implement rate limiting for login attempts
- Use secure token validation
- Set appropriate token expiration times

### API Security
- Rate limit sensitive endpoints
- Validate all input data
- Log security events
- Implement proper error handling without exposing sensitive information

### Payment Security
- Always verify webhook signatures
- Never log full payment details
- Implement idempotency for payment operations
- Follow PCI DSS guidelines for card handling

## Troubleshooting

### Common Issues

#### Authentication Problems
- Ensure Firebase configuration is correct
- Check JWT secret is properly set
- Verify token format in requests

#### Payment Processing Issues
- Verify PayMongo API keys
- Check webhook URL is accessible
- Validate webhook signature configuration

#### CORS Errors
- Ensure frontend origin is in the allowed origins list
- Check request headers match allowed headers
- Verify CORS middleware is correctly configured