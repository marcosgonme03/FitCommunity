import { Router } from 'express';
import * as ctrl from '../controllers/billing.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /billing/subscription:
 *   get:
 *     tags: [Billing]
 *     summary: Estado de mi suscripción Premium
 *     responses:
 *       200:
 *         description: Datos de la suscripción (status, periodo, cancelación pendiente)
 *
 * /billing/checkout:
 *   post:
 *     tags: [Billing]
 *     summary: Crear sesión de Stripe Checkout
 *     description: Genera una URL de Stripe para pagar 4,99 €/mes. Devuelve `checkoutUrl` a la que redirigir.
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             example: { success: true, data: { checkoutUrl: "https://checkout.stripe.com/..." } }
 *
 * /billing/portal:
 *   post:
 *     tags: [Billing]
 *     summary: Crear sesión de Customer Portal de Stripe
 *     description: URL para que el usuario gestione su tarjeta y facturas.
 *
 * /billing/cancel:
 *   post:
 *     tags: [Billing]
 *     summary: Cancelar suscripción al final del periodo
 *     description: La suscripción sigue activa hasta `current_period_end`. No reembolsa.
 *
 * /billing/webhook:
 *   post:
 *     tags: [Billing]
 *     summary: Webhook de Stripe (RAW body)
 *     description: |
 *       Endpoint que Stripe usa para notificar eventos (`checkout.session.completed`,
 *       `customer.subscription.updated`, etc). Validación con `STRIPE_WEBHOOK_SECRET`.
 *       **No requiere auth.** Montado fuera del router común porque necesita el body sin parsear.
 *     security: []
 */
router.get('/subscription', requireAuth, ctrl.getSubscription);
router.post('/checkout', requireAuth, ctrl.createCheckout);
router.post('/portal', requireAuth, ctrl.createPortal);
router.post('/cancel', requireAuth, ctrl.cancelSubscription);

// NOTE: webhook is mounted separately in app.ts because it needs raw body
// (BEFORE express.json() applies). Keep this here only for documentation:
// router.post('/webhook', ctrl.webhook);

export default router;
