import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initializeFirebase } from './config/firebase.js';

/**
 * Server entry point — PRD §64
 *
 * Initializes all external services (DB, Firebase) then starts listening.
 * Graceful shutdown is handled for clean connection closure.
 */
async function main(): Promise<void> {
  const { PORT, NODE_ENV } = getEnv();

  // Initialize external services
  initializeFirebase();

  try {
    await connectDatabase();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ MongoDB connection failed on startup: ${errorMsg}`);
    if (NODE_ENV === 'production') {
      throw err;
    }
    console.warn(
      '⚠️  [DEV MODE] Starting API server in degraded mode without MongoDB connection.\n' +
      '👉 To resolve: whitelist your current IP address on MongoDB Atlas (Network Access -> Add IP -> 0.0.0.0/0 for dev),\n' +
      '   or specify a local/reachable MongoDB URI in apps/api/.env'
    );
  }

  // Create and start Express
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`🚀 ETA API running on port ${PORT} [${NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      const { disconnectDatabase } = await import('./config/database.js');
      await disconnectDatabase();
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
