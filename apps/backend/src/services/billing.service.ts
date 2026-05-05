import Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getStripe } from '../lib/stripe';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

const STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  canceled: SubscriptionStatus.CANCELED,
  incomplete: SubscriptionStatus.INCOMPLETE,
  incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
  trialing: SubscriptionStatus.TRIALING,
  unpaid: SubscriptionStatus.UNPAID,
  paused: SubscriptionStatus.UNPAID,
};

export const billingService = {
  /**
   * Get or create the Stripe customer for a user.
   */
  async ensureCustomer(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        stripe_customer_id: true,
        profile: { select: { display_name: true } },
      },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    if (user.stripe_customer_id) return user.stripe_customer_id;

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.profile?.display_name ?? undefined,
      metadata: { user_id: user.id },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripe_customer_id: customer.id },
    });
    return customer.id;
  },

  /**
   * Create a Checkout Session for the Premium subscription.
   */
  async createCheckoutSession(userId: string, opts: {
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    if (!config.STRIPE_PRICE_ID) {
      throw new AppError(
        'STRIPE_PRICE_ID no configurado. Crea un precio en Stripe Dashboard.',
        500,
        'STRIPE_NOT_CONFIGURED'
      );
    }
    const stripe = getStripe();
    const customerId = await this.ensureCustomer(userId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: config.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { user_id: userId },
      },
      metadata: { user_id: userId },
    });

    if (!session.url) {
      throw new AppError('No se pudo crear la sesión de pago', 500, 'CHECKOUT_FAILED');
    }
    return { url: session.url };
  },

  /**
   * Open the Customer Portal so the user can manage / cancel their subscription.
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    const stripe = getStripe();
    const customerId = await this.ensureCustomer(userId);

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: portal.url };
  },

  /**
   * Cancel at period end (without portal).
   */
  async cancelSubscription(userId: string): Promise<void> {
    const stripe = getStripe();
    const sub = await prisma.subscription.findFirst({
      where: { user_id: userId, status: { in: ['ACTIVE', 'TRIALING'] } },
      orderBy: { created_at: 'desc' },
    });
    if (!sub) throw new AppError('No hay suscripción activa', 404, 'NO_SUBSCRIPTION');

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  },

  /**
   * Get the user's current subscription summary.
   */
  async getCurrentSubscription(userId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    if (!sub) return null;
    return {
      id: sub.id,
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at,
    };
  },

  /**
   * Upsert subscription from a Stripe subscription object and toggle is_premium.
   */
  async syncSubscriptionFromStripe(stripeSub: Stripe.Subscription): Promise<void> {
    const userId =
      (stripeSub.metadata?.user_id as string | undefined) ??
      (typeof stripeSub.customer === 'string'
        ? (
            await prisma.user.findUnique({
              where: { stripe_customer_id: stripeSub.customer },
              select: { id: true },
            })
          )?.id
        : undefined);

    if (!userId) {
      logger.warn(
        `Webhook: no se pudo asociar la subscription ${stripeSub.id} a un usuario`
      );
      return;
    }

    const status = STATUS_MAP[stripeSub.status] ?? SubscriptionStatus.INCOMPLETE;
    const priceId = stripeSub.items.data[0]?.price.id ?? '';
    const customerId =
      typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;

    await prisma.subscription.upsert({
      where: { stripe_subscription_id: stripeSub.id },
      create: {
        user_id: userId,
        stripe_subscription_id: stripeSub.id,
        stripe_customer_id: customerId,
        stripe_price_id: priceId,
        status,
        current_period_start: new Date(stripeSub.current_period_start * 1000),
        current_period_end: new Date(stripeSub.current_period_end * 1000),
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        canceled_at: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
      update: {
        status,
        stripe_price_id: priceId,
        current_period_start: new Date(stripeSub.current_period_start * 1000),
        current_period_end: new Date(stripeSub.current_period_end * 1000),
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        canceled_at: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
    });

    // Toggle is_premium based on status
    const isActive = status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;
    await prisma.user.update({
      where: { id: userId },
      data: { is_premium: isActive },
    });

    logger.info(
      `Subscription ${stripeSub.id} synced: user=${userId} status=${status} premium=${isActive}`
    );
  },

  /**
   * Verify and parse a Stripe webhook event.
   */
  parseWebhookEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    const stripe = getStripe();
    if (!config.STRIPE_WEBHOOK_SECRET) {
      throw new AppError(
        'STRIPE_WEBHOOK_SECRET no configurado',
        500,
        'WEBHOOK_NOT_CONFIGURED'
      );
    }
    return stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
  },
};
