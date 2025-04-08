import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';  // Enable cross-origin requests
import productRoutes from './backend/routes/products.js';
import userRoutes from './backend/routes/users.js';
import orderRoutes from './backend/routes/orders.js';
import cartRoutes from './backend/routes/cart.js';
import analyticsRoutes from './backend/routes/analytics.js';
import analyticsTestRoutes from './backend/routes/analytics-test.js';
import dotenv from 'dotenv';
import { auth } from './backend/middleware/auth.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();

// Define allowed origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://blcp.vercel.app',        // Production frontend URL
      'https://www.blcp.vercel.app'     // With www subdomain
    ]
  : [
      'http://localhost:3000',          // Local development 
      'http://localhost:5173'           // Vite default port
    ];

// Configure CORS with strict options
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Security headers middleware
app.use((req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  next();
});

// Middleware to parse JSON bodies
app.use(express.json({ limit: '1mb' })); // Limit request body size

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase';

// Enhanced MongoDB connection with retry logic
const connectWithRetry = () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, 
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10
  };
  
  console.log('Attempting MongoDB connection with retry mechanism...');
  
  mongoose.connect(mongoURI, options)
    .then(() => {
      console.log('MongoDB connected successfully');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

// Use the retry function instead of the direct connect
connectWithRetry();

// Mount the routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics-test', analyticsTestRoutes);

// Direct test routes for debugging
app.get('/api/direct-test', (req, res) => {
  res.json({ message: 'Direct test route in app.js is working' });
});

app.get('/api/direct-analytics', (req, res) => {
  res.json({
    message: 'Direct analytics test',
    timeframe: req.query.timeframe || 'default',
    data: { test: true }
  });
});

// Add this test route
app.get('/api/auth-test', auth, (req, res) => {
  res.json({ 
    message: 'Authentication successful',
    user: req.user 
  });
});

app.get('/api/token-debug', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  res.json({
    tokenReceived: !!token,
    tokenFirstChars: token ? token.substring(0, 10) + '...' : 'none',
    authHeader: req.headers.authorization ? 'present' : 'missing',
    envVars: {
      jwtSecretPresent: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0
    }
  });
});

app.get('/api/test-jwt', (req, res) => {
  const payload = { user: { id: 'test123', email: 'test@example.com' } };
  
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: '1h',
      algorithm: 'HS256'
    });
    
    res.json({ 
      message: 'Test JWT token generated',
      token,
      verifyUrl: `${req.protocol}://${req.get('host')}/api/verify-jwt?token=${token}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/verify-jwt', (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    res.json({ valid: true, decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: error.message });
  }
});

// Add a catch-all route for debugging purposes
app.use('*', (req, res) => {
  console.log('404 route hit for:', req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));