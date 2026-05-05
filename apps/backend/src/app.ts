import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';
import { swaggerSpec } from './lib/swagger';
import * as billingCtrl from './controllers/billing.controller';

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// En dev permitimos cualquier puerto de localhost (5173/5174/5175...).
// En producción aceptamos el FRONTEND_URL configurado, su contraparte con/sin
// "www." (para que da igual si el usuario entra a fitcommunity.es o a
// www.fitcommunity.es) y los previews de Vercel (*.vercel.app).
function buildAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();
  try {
    const base = new URL(config.FRONTEND_URL);
    allowed.add(base.origin);
    // Toggle www. ↔ apex
    if (base.hostname.startsWith('www.')) {
      const apex = new URL(base.origin);
      apex.hostname = base.hostname.slice(4);
      allowed.add(apex.origin);
    } else {
      const www = new URL(base.origin);
      www.hostname = `www.${base.hostname}`;
      allowed.add(www.origin);
    }
  } catch {
    // Si FRONTEND_URL no es una URL válida, simplemente no añadimos nada extra.
  }
  return allowed;
}

const allowedOrigins = buildAllowedOrigins();

const corsOrigin =
  config.NODE_ENV === 'development'
    ? (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return cb(null, true); // same-origin / curl / Postman
        try {
          const url = new URL(origin);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            return cb(null, true);
          }
        } catch {
          return cb(null, false);
        }
        return cb(null, false);
      }
    : (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return cb(null, true); // same-origin / curl / Postman
        if (allowedOrigins.has(origin)) return cb(null, true);
        // Vercel preview deployments (e.g. https://fitcommunity-xxxx.vercel.app)
        try {
          const url = new URL(origin);
          if (url.hostname.endsWith('.vercel.app')) return cb(null, true);
        } catch {
          return cb(null, false);
        }
        logger.warn(`[CORS] Origen rechazado: ${origin}`);
        return cb(null, false);
      };

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Stripe webhook (RAW body, must come BEFORE express.json) ────────────────
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  billingCtrl.webhook
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── HTTP logging ─────────────────────────────────────────────────────────────
if (config.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// ─── Health check ─────────────────────────────────────────────────────────────
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check del servicio
 *     security: []
 *     responses:
 *       200:
 *         description: Servicio operativo
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { status: "ok", env: "development", timestamp: "2026-05-05T22:00:00Z" }
 */
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      env: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── API documentation (Swagger UI + OpenAPI JSON) ───────────────────────────
// Helmet's CSP is too strict for Swagger UI's inline scripts → relax for /api/docs
app.use(
  '/api/docs',
  helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'FitCommunity API · Docs',
    customCss: `
      .swagger-ui .topbar { background: #f97316; }
      .swagger-ui .topbar .download-url-wrapper input[type=text] { border-color: #fdba74; }
      .swagger-ui .info .title { color: #c2410c; }
      .swagger-ui .opblock.opblock-post { border-color: #f97316; background: rgba(249,115,22,.05); }
      .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #f97316; }
    `,
  })
);
app.get('/api/openapi.json', (_req, res) => {
  res.json(swaggerSpec);
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── 404 & Error handlers ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
