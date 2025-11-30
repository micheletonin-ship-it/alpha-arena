// services/api.ts
// Centralized API service for all backend communications

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaymentIntentData {
  amount: number;
  currency: string;
  championshipId: string;
  stripeSecretKey: string;
  metadata?: {
    userEmail: string;
    userName: string;
    championshipId: string;
    championshipName: string;
    championshipStartingCash: string;
  };
}

interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

interface PaymentConfirmData {
  paymentIntentId: string;
  stripeSecretKey: string;
}

interface PaymentConfirmResponse {
  status: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
    console.log('[API Service] Initialized with URL:', this.baseUrl);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`[API Service] Request to: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
      }

      return { success: true, data };
    } catch (error: any) {
      console.error(`[API Service] Error [${endpoint}]:`, error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Health check endpoint
   * @returns Promise with health status
   */
  async healthCheck(): Promise<boolean> {
    const result = await this.request<{status: string}>('/api/health');
    return result.success && result.data?.status === 'ok';
  }

  /**
   * Create Stripe Payment Intent
   * @param data Payment intent data
   * @returns Promise with payment intent details
   */
  async createPaymentIntent(data: PaymentIntentData): Promise<ApiResponse<PaymentIntentResponse>> {
    return this.request<PaymentIntentResponse>('/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Confirm Payment
   * @param data Payment confirmation data
   * @returns Promise with payment status
   */
  async confirmPayment(data: PaymentConfirmData): Promise<ApiResponse<PaymentConfirmResponse>> {
    return this.request<PaymentConfirmResponse>('/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get current API URL
   * @returns Current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Update API URL (useful for switching environments)
   * @param newUrl New base URL
   */
  setBaseUrl(newUrl: string): void {
    this.baseUrl = newUrl;
    console.log('[API Service] Base URL updated to:', this.baseUrl);
  }
}

// Export singleton instance
export const api = new ApiService();

// Export types for use in other files
export type { ApiResponse, PaymentIntentData, PaymentIntentResponse, PaymentConfirmData, PaymentConfirmResponse };
