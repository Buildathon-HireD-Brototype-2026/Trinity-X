import 'dotenv/config';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;

const isTest = process.env.NODE_ENV === 'test' || (process.argv[1] && process.argv[1].includes('test'));

/**
 * Builds connection configuration for PostgreSQL pool.
 * Supports either:
 * 1) DATABASE_URL (single connection string), or
 * 2) Separate components: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */
function getDatabaseConfig() {
  if (isTest && process.env.DATABASE_URL_TEST) {
    return { connectionString: process.env.DATABASE_URL_TEST };
  }

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return { connectionString: process.env.DATABASE_URL.trim() };
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'hired_dev';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD !== undefined ? String(process.env.DB_PASSWORD) : undefined;
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

  return {
    host,
    port,
    database,
    user,
    password,
    ssl,
  };
}

const poolConfig = {
  ...getDatabaseConfig(),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '5000', 10),
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[database] Unexpected error on idle client:', err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Startup connection check that logs clearly:
 * "Database connected" or a readable error explaining what went wrong.
 */
export async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('[database] Database connected');
    return { success: true };
  } catch (error) {
    console.error(`[database] Database connection failed: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    if (client) {
      client.release();
    }
  }
}

export { pool, prisma };
export default prisma;
