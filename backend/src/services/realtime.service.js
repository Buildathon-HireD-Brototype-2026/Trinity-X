import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

// Set of active SSE response streams
const sseClients = new Set();

let listenerClient = null;
let isReconnecting = false;
let reconnectTimer = null;
let reconnectDelayMs = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;

/**
 * Derives connection options for the dedicated listener connection.
 * Priority:
 * 1. DB_LISTEN_URL (direct connection bypassing transaction-mode poolers like PgBouncer)
 * 2. DATABASE_URL
 * 3. Individual DB_* variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
 */
function getListenerConfig() {
  if (process.env.DB_LISTEN_URL && process.env.DB_LISTEN_URL.trim() !== '') {
    return { connectionString: process.env.DB_LISTEN_URL.trim() };
  }

  const isTest = process.env.NODE_ENV === 'test' || (process.argv[1] && process.argv[1].includes('test'));
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

/**
 * Broadcast an event payload to all connected SSE clients.
 */
export function broadcastEvent(eventData) {
  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

/**
 * Establishes the dedicated PostgreSQL LISTEN connection.
 */
export async function startDatabaseListener() {
  if (listenerClient) {
    try {
      listenerClient.removeAllListeners();
      await listenerClient.end();
    } catch {
      // ignore cleanup errors
    }
    listenerClient = null;
  }

  const config = getListenerConfig();
  listenerClient = new Client(config);

  listenerClient.on('notification', (msg) => {
    if (msg.channel === 'db_changes') {
      try {
        const payload = JSON.parse(msg.payload);
        broadcastEvent(payload);
      } catch {
        broadcastEvent({ raw: msg.payload });
      }
    }
  });

  listenerClient.on('error', (err) => {
    console.error('[realtime] Listener connection dropped: Database error -', err.message);
    scheduleReconnect();
  });

  listenerClient.on('end', () => {
    console.log('[realtime] Listener connection dropped: Connection ended');
    scheduleReconnect();
  });

  try {
    await listenerClient.connect();
    await listenerClient.query('LISTEN db_changes');
    reconnectDelayMs = 1000;
    isReconnecting = false;
    console.log('[realtime] Listener connected to PostgreSQL on channel db_changes');
  } catch (err) {
    console.error('[realtime] Listener failed to connect to PostgreSQL:', err.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (isReconnecting) return;
  isReconnecting = true;

  if (reconnectTimer) clearTimeout(reconnectTimer);
  console.log(`[realtime] Listener reconnecting in ${reconnectDelayMs}ms...`);

  reconnectTimer = setTimeout(async () => {
    console.log('[realtime] Listener reconnecting to PostgreSQL...');
    reconnectDelayMs = Math.min(reconnectDelayMs * 1.5, MAX_RECONNECT_DELAY_MS);
    await startDatabaseListener();
  }, reconnectDelayMs);
}

/**
 * Server-Sent Events (SSE) route handler.
 * Mounted at /api/v1/events and /api/events.
 */
export function sseEventsHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': connected\n\n');
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
}

// Heartbeat to keep intermediate proxies and browser connections alive
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);
