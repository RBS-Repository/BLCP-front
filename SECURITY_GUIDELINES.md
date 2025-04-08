# Security Implementation Guidelines

This document provides specific code examples and guidelines for implementing security best practices in the BLCP application. Use these patterns when adding new features or modifying existing functionality.

## Authentication Implementation

### Firebase Authentication

**Client-side authentication:**

```javascript
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const loginUser = async (email, password) => {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get ID token for API calls
    const token = await user.getIdToken();
    
    // Store token securely (prefer HTTP-only cookies)
    // Alternative for development: secure localStorage
    sessionStorage.setItem('authToken', token);
    
    return { success: true, user };
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    return { 
      success: false, 
      error: error.message || 'Authentication failed'
    };
  }
};
```

**Server-side token verification:**

```javascript
// Use the auth middleware for protected routes
import { auth } from '../middleware/auth.js';

router.get('/protected-resource', auth, async (req, res) => {
  // req.user contains the authenticated user information
  res.json({ 
    message: 'Protected data', 
    data: { userId: req.user.uid }
  });
});
```

### JWT Implementation

**Generate JWT token:**

```javascript
import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  const payload = {
    user: {
      id: user.id,
      email: user.email,
      // Never include sensitive data like passwords in the token
    }
  };
  
  // Always specify algorithm and expiration
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256'
  });
};
```

**Verify JWT token:**

```javascript
// In auth middleware
try {
  // Always specify algorithm to prevent algorithm switching attacks
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { 
    algorithms: ['HS256'] 
  });
  
  req.user = decoded.user;
  next();
} catch (error) {
  return res.status(401).json({ error: 'Invalid token' });
}
```

## Input Validation

### Request Validation

Use express-validator to validate and sanitize all user inputs:

```javascript
import { body, validationResult } from 'express-validator';

router.post('/new-endpoint',
  [
    // Validate and sanitize inputs
    body('email').isEmail().normalizeEmail(),
    body('name').trim().escape().isLength({ min: 2, max: 50 }),
    body('amount').isNumeric().toFloat(),
    body('description').trim().escape().optional(),
    
    // Custom validation
    body('customField').custom(value => {
      if (/* validation logic */) {
        throw new Error('Custom validation error');
      }
      return true;
    })
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Proceed with validated data
    const { email, name, amount, description } = req.body;
    
    // Process the request...
  }
);
```

### Database Query Security

Prevent injection attacks by using parameterized queries:

```javascript
// MongoDB with Mongoose (already parameterized)
const user = await User.findOne({ email: userInput });

// MongoDB native driver
const user = await db.collection('users').findOne(
  { email: userInput },  // Parameters handled safely
  { projection: { password: 0 } }  // Exclude sensitive fields
);

// When using raw queries, always parameterize
const result = await db.collection('products').updateOne(
  { _id: new ObjectId(productId) },  // Safe parameter handling
  { $set: { name: productName, price: productPrice } }
);
```

## CORS Implementation

```javascript
import cors from 'cors';

// Define allowed origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://yourproductiondomain.com',
      'https://www.yourproductiondomain.com'
    ]
  : [
      'http://localhost:3000',
      'http://localhost:5173'
    ];

// Configure CORS with appropriate options
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
```

## Rate Limiting

Implement rate limiting on sensitive endpoints:

```javascript
import rateLimit from 'express-rate-limit';

// Basic rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Apply to all requests
app.use(apiLimiter);

// Stricter limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});

// Apply to auth routes only
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

## Security Headers

```javascript
// Security headers middleware
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Protect against XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://trusted-cdn.com; style-src 'self' https://trusted-cdn.com; img-src 'self' data: https://trusted-cdn.com;");
  
  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});
```

## Payment Processing Security

### Webhook Signature Verification

```javascript
import crypto from 'crypto';

const verifyWebhookSignature = (payload, signature) => {
  try {
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Missing webhook secret');
      return false;
    }
    
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = hmac.update(payload).digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

// Webhook route
router.post('/webhook',
  express.raw({type: 'application/json'}),
  async (req, res) => {
    try {
      const signature = req.headers['paymongo-signature'];
      
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }
      
      const payload = req.body.toString();
      
      // Verify signature before processing
      if (!verifyWebhookSignature(payload, signature)) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      const event = JSON.parse(payload);
      
      // Log event for audit purposes
      console.log('Webhook received:', event.type);
      
      // Process webhook event...
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);
```

### Payment Data Handling

```javascript
// Creating a payment source
const createPaymentSource = async (orderData) => {
  // Validate data
  if (!orderData.amount || !orderData.type) {
    throw new Error('Invalid payment data');
  }
  
  // Create payment source
  const source = await paymongoService.createSource({
    amount: Number(orderData.amount),
    type: orderData.type,
    currency: 'PHP',
    redirect: {
      success: orderData.successUrl,
      failed: orderData.failureUrl
    },
    // Never include full customer details in metadata
    metadata: {
      order_id: orderData.orderId,
      customer_id: orderData.customerId
    }
  });
  
  // Update order with payment reference only
  await Order.findByIdAndUpdate(orderData.orderId, {
    'payment.sourceId': source.id,
    'payment.method': orderData.type,
    'payment.status': 'pending'
  });
  
  return {
    sourceId: source.id,
    checkoutUrl: source.attributes.redirect.checkout_url
  };
};
```

## Error Handling

Implement secure error handling to prevent information disclosure:

```javascript
// Global error handler
app.use((err, req, res, next) => {
  // Log the full error details for debugging
  console.error('Error:', err);
  
  // Determine if error is operational (expected) or programmatic
  const isOperational = err.isOperational || false;
  
  // In production, don't expose error details to the client
  if (process.env.NODE_ENV === 'production') {
    return res.status(err.statusCode || 500).json({
      error: isOperational ? err.message : 'An unexpected error occurred'
    });
  }
  
  // In development, more information can be provided
  return res.status(err.statusCode || 500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Custom operational error
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage example
router.get('/resource/:id', async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      throw new AppError('Resource not found', 404);
    }
    
    res.json(resource);
  } catch (error) {
    next(error);
  }
});
```

## Password Management

```javascript
import bcrypt from 'bcryptjs';

// Hash password before saving
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12); // Use high cost factor
  return bcrypt.hash(password, salt);
};

// Verify password
const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// Password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const isValid = 
    password.length >= minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumbers &&
    hasSpecialChars;
    
  return {
    isValid,
    errors: {
      length: password.length < minLength,
      uppercase: !hasUppercase,
      lowercase: !hasLowercase,
      numbers: !hasNumbers,
      specialChars: !hasSpecialChars
    }
  };
};
```

## File Upload Security

```javascript
import multer from 'multer';
import path from 'path';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    // Create a safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Validate file type
const fileFilter = (req, file, cb) => {
  // Accept only specific mime types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// File upload route
router.post('/upload', 
  auth, // Require authentication
  upload.single('image'), // Process single file upload
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Process the uploaded file
      
      res.json({
        success: true,
        filename: req.file.filename,
        path: '/uploads/' + req.file.filename
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  }
);
```

## Role-Based Access Control

```javascript
// Role-based middleware
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role || 'user';
    
    if (roles.includes(userRole)) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'You do not have permission to access this resource' 
    });
  };
};

// Usage examples
router.get('/admin/dashboard', 
  auth, 
  checkRole(['admin']), 
  (req, res) => {
    res.json({ adminData: 'secret admin data' });
  }
);

router.get('/manager/reports', 
  auth, 
  checkRole(['admin', 'manager']), 
  (req, res) => {
    res.json({ reports: 'manager reports data' });
  }
);
```

## Database Access Control

### MongoDB Schema Security

```javascript
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Don't include password in query results by default
  },
  role: {
    type: String,
    enum: ['user', 'manager', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  // Track important security events
  lastLogin: {
    type: Date,
    default: null
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Need to explicitly select password since it's excluded by default
    const user = await this.model('User').findById(this._id).select('+password');
    return bcrypt.compare(candidatePassword, user.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChange = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Create model
const User = mongoose.model('User', UserSchema);

export default User;
```

## Logging

Implement secure logging practices:

```javascript
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => {
    // Redact sensitive information
    let message = info.message;
    if (typeof message === 'string') {
      // Redact passwords, tokens, etc.
      message = message.replace(/("password":\s*")([^"]+)(")/g, '$1[REDACTED]$3');
      message = message.replace(/(Authorization:\s*Bearer\s*)([^\s]+)/g, '$1[REDACTED]');
      message = message.replace(/(api[Kk]ey|secret[Kk]ey)=([^&\s]+)/g, '$1=[REDACTED]');
    }
    
    return `${info.timestamp} ${info.level}: ${message}`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console(),
    
    // Write all logs error (and below) to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    })
  ],
  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log') 
    })
  ]
});

// Logging middleware
app.use((req, res, next) => {
  // Log request
  logger.info({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    requestId: req.id // Assuming you've assigned request IDs
  });
  
  // Log response
  const originalEnd = res.end;
  res.end = function(...args) {
    logger.info({
      statusCode: res.statusCode,
      responseTime: Date.now() - req._startTime,
      requestId: req.id
    });
    originalEnd.apply(res, args);
  };
  req._startTime = Date.now();
  
  next();
});

// Security event logging
const logSecurityEvent = (event) => {
  logger.warn({
    type: 'SECURITY',
    ...event
  });
};

// Usage example
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Authentication logic...
    
    if (authFailed) {
      logSecurityEvent({
        action: 'FAILED_LOGIN',
        user: email,
        ip: req.ip,
        reason: 'Invalid credentials'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Successful login
    logSecurityEvent({
      action: 'SUCCESSFUL_LOGIN',
      user: email,
      ip: req.ip
    });
    
    // Return token, etc.
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});
```

## Dependency Management

Regularly update dependencies and scan for vulnerabilities:

```bash
# Check for vulnerable dependencies
npm audit

# Fix vulnerabilities automatically where possible
npm audit fix

# Update dependencies
npm update

# Update to latest major versions (careful, may break compatibility)
npx npm-check-updates -u
npm install
```

## Additional Security Resources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://github.com/ChALkeR/notes/blob/master/Securing-Node.js-Applications.md)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/) 