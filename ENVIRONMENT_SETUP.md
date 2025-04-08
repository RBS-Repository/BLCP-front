# Environment Setup Guide

This guide will help you set up your development and production environments for the BLCP application with a focus on security.

## Local Development Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (local or MongoDB Atlas)
- Firebase account
- PayMongo account (for payment processing)
- Git

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd blcp
```

### Step 2: Install Dependencies
```bash
# Using npm
npm install

# Using pnpm
pnpm install
```

### Step 3: Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

#### Required Environment Variables

1. **Core Application Settings**
```
VITE_APP_TITLE=BLCP
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:5000/api
PORT=5000
```

2. **Firebase Configuration**

Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/) and obtain your config:

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

3. **Firebase Admin SDK Configuration**

Generate a new private key for your Firebase Admin SDK:
- Go to Firebase Console > Project Settings > Service Accounts
- Click "Generate new private key"
- Copy the values into your `.env` file:

```
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

4. **MongoDB Configuration**

Set up a MongoDB database locally or using MongoDB Atlas:

```
MONGO_URI=mongodb://localhost:27017/my-app
```

For MongoDB Atlas:
```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<db-name>?retryWrites=true&w=majority
```

5. **PayMongo Configuration**

Create a PayMongo account at [https://dashboard.paymongo.com/signup](https://dashboard.paymongo.com/signup) and get your API keys:

```
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_PUBLIC_KEY=your_paymongo_public_key
```

6. **Webhook Configuration**

For local development, you'll need a tool like ngrok to expose your local server:
```
PAYMONGO_WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/payments/webhook
```

7. **JWT Secret**

Generate a strong random string for JWT signing:
```
JWT_SECRET=your_generated_jwt_secret
```

You can generate a secure random string using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Start Development Server

```bash
# Run frontend only
npm run dev

# Run backend only
npm run dev:server

# Run both concurrently
npm run dev:all
```

## Production Environment Setup

### Environment Variables

For production deployment, configure your environment variables securely:

1. **Never commit `.env` files** to the repository
2. **Use environment-specific settings**:
   ```
   NODE_ENV=production
   VITE_API_BASE_URL=https://your-production-api.com/api
   ```
3. **Configure secure URLs**:
   ```
   WEBHOOK_URL=https://your-production-domain.com/api/payments/webhook
   ```

### Setting Up Environment Variables on Hosting Platforms

#### Vercel

1. Go to your project in the Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add each environment variable and its value
4. Set the appropriate environments (Production, Preview, Development)

#### Heroku

```bash
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set PAYMONGO_SECRET_KEY=your_paymongo_secret_key
# Add all other variables
```

#### AWS

1. Use AWS Systems Manager Parameter Store for environment variables
2. Configure your application to load from SSM

### Security Considerations

#### Secret Management

1. **Use different secrets for each environment**
2. **Rotate secrets regularly**:
   - PayMongo API keys
   - JWT secrets
   - Database credentials
3. **Consider a secrets management solution** like HashiCorp Vault or AWS Secrets Manager

#### Access Control

1. **Limit access to production credentials**
2. **Implement audit logging** for credential usage
3. **Use role-based access control** for cloud services

#### Connection Security

1. **Use HTTPS for all production endpoints**
2. **Configure proper SSL/TLS settings**
3. **Set up appropriate CORS headers**

## Firebase Setup

### Authentication Configuration

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Email/Password authentication
3. (Optional) Configure other authentication methods

### Firestore Rules

Deploy the Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

### Firebase Admin SDK

For production, consider using environment-specific service accounts with limited permissions.

## MongoDB Setup

### Database User

Create a dedicated user with appropriate permissions:

```javascript
db.createUser({
  user: "app_user",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "my-app" }
  ]
})
```

### Connection Security

1. **Use TLS/SSL connections**:
   ```
   MONGO_URI=mongodb://user:password@host:port/db?ssl=true
   ```
2. **Set up IP allowlisting** in MongoDB Atlas or your MongoDB server

## PayMongo Setup

### API Keys

1. Use test keys for development and staging environments
2. Use live keys only in production
3. Restrict API key usage with proper security policies

### Webhook Configuration

1. Configure webhooks in the PayMongo dashboard
2. Generate and securely store webhook secrets
3. Implement signature verification in your application

## Database Migrations

For a consistent database structure across environments:

```bash
# Run migrations locally
npm run migrate

# Run migrations in production
npm run migrate:prod
```

## Common Issues and Troubleshooting

### Environment Variable Issues

- **Problem**: Environment variables not loading
- **Solution**: Check that you've created the `.env` file or set them in your environment

### Database Connection Issues

- **Problem**: Cannot connect to MongoDB
- **Solution**: Check your IP allowlist, credentials, and network connectivity

### PayMongo Integration Issues

- **Problem**: Webhooks not being received
- **Solution**: Verify webhook URL is publicly accessible and correctly configured

### Firebase Authentication Issues

- **Problem**: Firebase Auth not working
- **Solution**: Check Firebase configuration and credentials

## Security Checklist

Before deploying to production, verify:

- [ ] All secrets are stored securely and not in code
- [ ] Development and production environments use different credentials
- [ ] HTTPS is configured for all endpoints
- [ ] Database access is restricted and secured
- [ ] Authentication and authorization are properly implemented
- [ ] Proper error handling is in place
- [ ] Logging and monitoring are configured 