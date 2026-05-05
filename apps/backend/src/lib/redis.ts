import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 3000,
  retryStrategy: (times) => {
    if (times > 2) return null; // stop retrying after 2 attempts
    return 500;
  },
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', () => {}); // silencia errores repetitivos en dev
redis.on('close', () => logger.warn('Redis connection closed'));

/**
 * Safe wrapper — returns null if Redis is unavailable
 */
async function safeExec<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  await safeExec(() =>
    ttlSeconds ? redis.set(key, value, 'EX', ttlSeconds) : redis.set(key, value)
  );
}

export async function redisGet(key: string): Promise<string | null> {
  return safeExec(() => redis.get(key));
}

export async function redisDel(key: string): Promise<void> {
  await safeExec(() => redis.del(key));
}

export async function blacklistToken(tokenId: string, ttlSeconds: number): Promise<void> {
  await redisSet(`blacklist:${tokenId}`, '1', ttlSeconds);
}

export async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  const val = await redisGet(`blacklist:${tokenId}`);
  return val !== null;
}
