import Stripe from 'stripe';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Stripe client singleton.
 *
 * NOTE: We initialise the client lazily so that the app can boot without
 * STRIPE_SECRET_KEY in dev. Calling `getStripe()` will throw if the key is
 * missing — billing endpoints handle that error gracefully.
 */

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!config.STRIPE_SECRET_KEY) {
    throw new Error(
      'Stripe no está configurado. Define STRIPE_SECRET_KEY en tu .env. ' +
        'Consulta el README para más detalles.'
    );
  }
  _stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
  logger.info('💳 Stripe client initialised');
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!config.STRIPE_SECRET_KEY && !!config.STRIPE_PRICE_ID;
}
