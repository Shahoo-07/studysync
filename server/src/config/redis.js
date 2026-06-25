import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  pingInterval: 30000, // Keep connection alive by pinging every 30 seconds
  socket: {
    keepAlive: 5000,   // TCP Keep-Alive
    reconnectStrategy: (retries) => {
      // Try to reconnect with backoff up to 3 seconds
      return Math.min(retries * 100, 3000);
    }
  }
});

client.on('error', (err) => console.error('Redis Client Error', err));

await client.connect();

export default client;
