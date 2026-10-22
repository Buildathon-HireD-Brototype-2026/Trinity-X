import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import prisma from './config/db.js';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';
import orderRouter from './routes/order.routes.js';
import invoiceRouter from './routes/invoice.routes.js';
import reportRouter from './routes/report.routes.js';
import notificationRouter from './routes/notification.routes.js';
import driverRouter from './routes/driver.routes.js';
import { downloadSignedFileHandler } from './modules/driver/file.controller.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { errorResponse } from './shared/response.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Essential security & parsing middlewares
app.use(helmet());

// CORS configuration: explicit allowed origins, allowing mobile apps & server calls without origin
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000', 'http://localhost:8080'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
 
// Signed document retrieval endpoint
app.get('/api/v1/files/signed', downloadSignedFileHandler);
app.get('/files/signed', downloadSignedFileHandler);

// Route registration (both standard /api/v1 paths and direct paths for backward compatibility)
app.use('/api/v1/auth', authRouter);
app.use('/auth', authRouter);

app.use('/api/v1/admin', adminRouter);
app.use('/admin', adminRouter);

app.use('/api/v1/orders', orderRouter);
app.use('/orders', orderRouter);
app.use('/api/v1/partner/orders', orderRouter);
app.use('/partner/orders', orderRouter);

app.use('/api/v1/invoices', invoiceRouter);
app.use('/invoices', invoiceRouter);
app.use('/api/v1/partner/invoices', invoiceRouter);
app.use('/partner/invoices', invoiceRouter);

app.use('/api/v1/reports', reportRouter);
app.use('/reports', reportRouter);
app.use('/api/v1/partner/trips', reportRouter);
app.use('/partner/trips', reportRouter);

app.use('/api/v1/notifications', notificationRouter);
app.use('/notifications', notificationRouter);

app.use('/api/v1/driver', driverRouter);
app.use('/driver', driverRouter);

// Health check endpoint to verify server and database connectivity
const healthHandler = async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};

app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// 404 Handler for undefined routes
app.use((req, res) => {
  if (req.originalUrl?.startsWith('/api/v1') || req.path?.startsWith('/api/v1')) {
    return errorResponse(res, 404, 'NOT_FOUND', `Route not found: ${req.method} ${req.path}`);
  }
  return res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.method} ${req.path} does not exist.`
  });
});

// Centralized error handling middleware
app.use(errorHandler);

let server = null;
const isTestRun = process.env.NODE_ENV === 'test' || (process.argv[1] && process.argv[1].includes('test.js'));

if (!isTestRun) {
  server = app.listen(PORT, async () => {
    console.log(`[server] Server listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[database] PostgreSQL connected successfully');
    } catch (error) {
      console.error('[database] Database connection failed:', error.message);
    }
  });
}

// Graceful shutdown handler
const handleShutdown = (signal) => {
  console.log(`[server] Received ${signal}. Closing HTTP server...`);
  server.close(async () => {
    console.log('[server] HTTP server closed gracefully.');
    await prisma.$disconnect();
    console.log('[database] Prisma disconnected.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
