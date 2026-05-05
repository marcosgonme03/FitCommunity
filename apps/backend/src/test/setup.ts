/**
 * Jest global setup — runs BEFORE any test module is imported.
 * Sets the minimum env vars required for the config/index.ts Zod schema to pass.
 * Tests that need specific values override them individually.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.FRONTEND_URL = 'http://localhost:5174';
process.env.API_URL = 'http://localhost:3001';

// Database — SQLite-style URL so the config schema validates.
// Real DB is NOT used in unit tests; integration tests mock or skip DB calls.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fitcommunity_test';

// Redis — lazyConnect is true in lib/redis.ts, so no real connection is attempted.
process.env.REDIS_URL = 'redis://localhost:6379';

// JWT — 64+ char secrets for strict validation
process.env.JWT_ACCESS_SECRET =
  'test_access_secret_that_is_at_least_64_characters_long_for_testing_purposes_only';
process.env.JWT_REFRESH_SECRET =
  'test_refresh_secret_that_is_at_least_64_characters_long_for_testing_purposes_only';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Misc
process.env.BCRYPT_SALT_ROUNDS = '10';
process.env.LOG_LEVEL = 'error'; // silencia logs durante tests
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.AUTH_RATE_LIMIT_MAX = '20';
process.env.SMTP_HOST = 'smtp.mailtrap.io';
process.env.SMTP_PORT = '587';
process.env.TOTP_APP_NAME = 'FitCommunity';
