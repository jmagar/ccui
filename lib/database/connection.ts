import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// Environment variables with defaults for development
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/claude_code_ui';
const DATABASE_MAX_CONNECTIONS = parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10');
const DATABASE_IDLE_TIMEOUT = parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30');

// Create postgres client
const client = postgres(DATABASE_URL, {
  max: DATABASE_MAX_CONNECTIONS,
  idle_timeout: DATABASE_IDLE_TIMEOUT,
  connect_timeout: 60,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await client.end();
    console.log('Database connection closed gracefully');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

// Handle process shutdown
process.on('SIGINT', closeDatabaseConnection);
process.on('SIGTERM', closeDatabaseConnection);
process.on('exit', closeDatabaseConnection);