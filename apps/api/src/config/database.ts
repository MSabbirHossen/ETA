import mongoose from 'mongoose';
import { getEnv } from './env.js';

/**
 * MongoDB connection — PRD §62, §69
 *
 * Centralized connection with environment-based URI.
 * Connection events are logged for operational visibility.
 */
export async function connectDatabase(): Promise<void> {
  const { MONGODB_URI, NODE_ENV } = getEnv();

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
  });

  if (NODE_ENV === 'development') {
    mongoose.set('bufferTimeoutMS', 1000);
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: NODE_ENV === 'test' ? 'etaDB_test' : 'etaDB',
    serverSelectionTimeoutMS: 5000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
