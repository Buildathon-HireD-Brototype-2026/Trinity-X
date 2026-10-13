import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import prisma from './config/db.js';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Essential middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Route registration (both direct documented paths and /api/v1 aliases)
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);

// Health check endpoint to verify development server and database connectivity
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

