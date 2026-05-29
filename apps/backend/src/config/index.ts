import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  SMTP_HOST: z.string().default('smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('FitCommunity <noreply@fitcommunity.app>'),

  TOTP_APP_NAME: z.string().default('FitCommunity'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(14).default(12),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  // 1000 req / 15 min = ~66/min por usuario (o IP en su defecto). Suficiente
  // para un usuario activo. Si necesitas más, ajusta vía .env sin tocar código.
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),

  // ─── Stripe (Premium) ───────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // ─── Groq (IA) ──────────────────────────────────────────────────────────
  // Groq es un proveedor de inferencia ultra-rápida con free tier sin tarjeta.
  // Modelo recomendado: llama-3.3-70b-versatile (calidad GPT-4-mini + JSON mode).
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
