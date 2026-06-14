import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import RedisStore from 'rate-limit-redis';
import helmet from 'helmet';
import compression from 'compression';

import authRoutes from './routes/auth.js';
import curriculumRoutes from './routes/curriculum.js';
import materialsRoutes from './routes/materials.js';
import adminRoutes from './routes/admin.js';
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// When running behind a reverse proxy (NGINX, Vercel, Cloud Run...),
// trust the first proxy so secure cookies and client IPs work correctly.
app.set('trust proxy', process.env.TRUST_PROXY || 1);

// Security headers and response compression
app.disable('x-powered-by');
app.use(helmet());
app.use(compression());

// Security middleware
const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(url => url.trim());

// Use a function so we can validate origin at runtime and reject unknown origins.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: This origin is not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
// Redis client for rate limiting and caching (improves horizontal scalability)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true
});

// Try connecting to Redis; if it fails, fall back to in-memory store (still safe).
let redisAvailable = false;
try {
  await redisClient.connect();
  redisAvailable = true;
  console.log('Redis connected for rate limiting and caching.');
} catch (err) {
  console.warn('Redis not available - falling back to in-memory rate limiter. Error:', err.message || err);
}

// Avoid unhandled redis errors flooding logs when Redis isn't configured/reachable
redisClient.on('error', (e) => {
  console.warn('Redis client error:', e.message || e);
});

if (!redisAvailable) {
  try { redisClient.disconnect(); } catch (e) { /* ignore */ }
}

// Rate limiting using Redis store when available, otherwise memory store
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisAvailable ? new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }) : undefined
});
app.use('/api/', limiter);

// Stricter limit for auth (login endpoints)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisAvailable ? new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }) : undefined
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/admin-login', authLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/admin', adminRoutes);

// Debug: check Supabase storage bucket list (helps diagnose upload 500)
app.get('/api/debug/storage', async (req, res) => {
  try {
    const { data, error } = await supabase.storage.from('beno-files').list('', { limit: 50 });
    if (error) {
      console.error('Supabase storage.list error:', error);
      return res.status(500).json({ error: error.message, details: error });
    }
    return res.json({ success: true, files: data });
  } catch (err) {
    console.error('Storage debug endpoint failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error.' 
      : err.message 
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Beno Group API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;

// Ensure storage bucket exists (auto-create 'beno-files' if missing)
(async () => {
  try {
    const bucketName = 'beno-files';
    const { data, error } = await supabase.storage.createBucket(bucketName, { public: true });
    if (error) {
      // Status 409 means bucket already exists
      if (error.status === 409) {
        console.log(`Storage bucket '${bucketName}' already exists.`);
      } else {
        console.error(`Error creating storage bucket '${bucketName}':`, error);
      }
    } else {
      console.log(`Created storage bucket '${bucketName}'.`, data);
    }
  } catch (err) {
    console.error('Failed to ensure storage bucket exists:', err);
  }
})();
