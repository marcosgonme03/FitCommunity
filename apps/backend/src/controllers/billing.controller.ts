import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { billingService } from '../services/billing.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

export async function createCheckout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const frontend = config.FRONTEND_URL;
    const result = await billingService.createCheckoutSession(req.user.userId, {
      successUrl: `${frontend}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontend}/billing/cancel`,
    });
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function createPortal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const result = await billingService.createPortalSession(
      req.user.userId,
      `${config.FRONTEND_URL}/settings`
    );
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function cancelSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    await billingService.cancelSubscription(req.user.userId);
    sendSuccess(res, { canceled: true }, { message: 'Suscripción se cancelará al final del período' });
  } catch (e) {
    next(e);
  }
}

export async function getSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const sub = await billingService.getCurrentSubscription(req.user.userId);
    sendSuccess(res, { subscription: sub });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/billing/webhook
 * Stripe webhook — does NOT require auth and uses raw body for signature verification.
 */
export async function webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sig = req.headers['stripe-signature'];
    if (typeof sig !== 'string') {
      throw new AppError('Firma de webhook ausente', 400, 'NO_SIGNATURE');
    }

    // req.body must be the raw Buffer (configured in app.ts before json parser)
    const event = billingService.parseWebhookEvent(req.body as Buffer, sig);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && typeof session.subscription === 'string') {
          const stripe = (await import('../lib/stripe')).getStripe();
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await billingService.syncSubscriptionFromStripe(sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await billingService.syncSubscriptionFromStripe(sub);
        break;
      }
      default:
        logger.info(`Stripe webhook ignored: ${event.type}`);
    }

    res.json({ received: true });
  } catch (e) {
    next(e);
  }
}
