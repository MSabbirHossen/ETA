import { Router } from 'express';
import { sendSuccess } from '../../common/response.js';
import mongoose from 'mongoose';

const healthRouter: Router = Router();

/**
 * GET /api/v1/health
 *
 * Full system health overview for operational dashboards.
 */
healthRouter.get('/', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  sendSuccess(res, {
    status: dbState === 1 ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * GET /api/v1/health/liveness
 *
 * Lightweight process liveness probe. Returns 200 if process event loop is active.
 * Does not make external network or database calls.
 */
healthRouter.get('/liveness', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/health/readiness
 *
 * Deployment readiness probe. Verifies database connectivity.
 * Fails with 503 if primary database is not ready to serve traffic.
 */
healthRouter.get('/readiness', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const isReady = dbState === 1;

  if (isReady) {
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      database: dbState === 2 ? 'connecting' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

export { healthRouter };
