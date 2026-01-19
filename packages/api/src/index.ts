import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root
dotenvConfig({ path: resolve(process.cwd(), '../../.env') });
dotenvConfig({ path: resolve(process.cwd(), '.env') });

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { getDb } from '@usdc-eurc-analytics/db';
import { transfersRouter } from './routes/transfers.js';
import { statsRouter } from './routes/stats.js';
import { chainsRouter } from './routes/chains.js';
import { walletsRouter } from './routes/wallets.js';

// Initialize database
const db = getDb();

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'USDC/EURC Analytics API',
    version: '0.1.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// API routes
const api = new Hono();
api.route('/transfers', transfersRouter(db));
api.route('/stats', statsRouter(db));
api.route('/chains', chainsRouter(db));
api.route('/wallets', walletsRouter(db));

app.route('/api', api);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Start server
const port = parseInt(process.env.API_PORT || '3001', 10);

console.log(`Starting USDC/EURC Analytics API on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`API server running at http://localhost:${port}`);
