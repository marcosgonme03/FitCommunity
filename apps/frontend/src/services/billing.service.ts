import { api } from './api';
import { SubscriptionInfo, ApiResponse } from '../types';

const billingService = {
  async getSubscription(): Promise<{ subscription: SubscriptionInfo | null }> {
    const { data } = await api.get<ApiResponse<{ subscription: SubscriptionInfo | null }>>(
      '/billing/subscription'
    );
    return data.data!;
  },

  async createCheckout(): Promise<{ url: string }> {
    const { data } = await api.post<ApiResponse<{ url: string }>>('/billing/checkout');
    return data.data!;
  },

  async openPortal(): Promise<{ url: string }> {
    const { data } = await api.post<ApiResponse<{ url: string }>>('/billing/portal');
    return data.data!;
  },

  async cancel(): Promise<void> {
    await api.post('/billing/cancel');
  },
};

export default billingService;
