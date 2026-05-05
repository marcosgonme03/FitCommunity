import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';

async function bootstrap() {
  // Connect to Redis (non-blocking — app works without it in dev)
  try {
    await redis.connect();
    logger.info('Redis connected ✓');
  } catch (err) {
    logger.warn('Redis not available — continuing without cache (dev mode):', err);
  }

  // Verify Prisma / DB connection
  await prisma.$connect();
  logger.info('Database connected ✓');

  // Start HTTP server
  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 FitCommunity API → http://localhost:${config.PORT}`);
    logger.info(`   Env:      ${config.NODE_ENV}`);
    logger.info(`   Frontend: ${config.FRONTEND_URL}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} — shutting down…`);
    server.close(async () => {
      await prisma.$disconnect();
      redis.disconnect();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
