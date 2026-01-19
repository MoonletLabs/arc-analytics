import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// Export schema
export * from './schema/index.js';

// Database connection singleton
let db: ReturnType<typeof createDb> | null = null;

function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

/**
 * Get or create database connection
 */
export function getDb(connectionString?: string) {
  if (!db) {
    const url = connectionString || process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    db = createDb(url);
  }
  return db;
}

/**
 * Create a new database connection (for testing or isolated contexts)
 */
export function createDatabase(connectionString: string) {
  return createDb(connectionString);
}

// Export drizzle types
export type Database = ReturnType<typeof createDb>;
