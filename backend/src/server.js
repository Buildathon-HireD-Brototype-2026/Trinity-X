import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import prisma from './config/db.js';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';
import { downloadSignedFileHandler } from './modules/driver/file.controller.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { errorResponse } from './shared/response.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Essential security & parsing middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Signed document retrieval endpoint
app.get('/api/v1/files/signed', downloadSignedFileHandler);
app.get('/files/signed', downloadSignedFileHandler);

// Route registration (both standard /api/v1 paths and direct /auth, /admin paths)
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/auth', authRouter);
app.use('/admin', adminRouter);

// Health check endpoint to verify server and database connectivity
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
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
});

// 404 Handler for undefined routes
app.use((req, res) => {
  if (req.originalUrl?.startsWith('/api/v1')) {
    return errorResponse(res, 404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`);
  }
  return res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.method} ${req.url} does not exist.`
  });
});

// Centralized error handling middleware
app.use(errorHandler);

const server = app.listen(PORT, async () => {
  console.log(`[server] Server listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('[database] PostgreSQL connected successfully (database: hired_dev)');
  } catch (error) {
    console.error('[database] Database connection failed:', error.message);
  }
});

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
