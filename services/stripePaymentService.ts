// services/stripePaymentService.ts
// This file handles real backend API calls for Stripe payment processing.
// The backend server safely handles Stripe Secret Keys and interacts with Stripe's API.

// Backend API URL - Uses environment variable or falls back to localhost for development
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PaymentResponse {
  success: boolean;
  message: string;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
}

/**
 * Creates a PaymentIntent via the backend API.
 * 
 * @param amount The amount to charge (in dollars, will be converted to cents by backend).
 * @param currency The currency (e.g., 'usd', 'eur').
 * @param championshipId The ID of the championship to associate with the payment.
 * @param stripeSecretKey The Stripe secret key for the championship admin.
 * @returns A promise resolving to a PaymentResponse with clientSecret.
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string,
  championshipId: string,
  stripeSecretKey: string | null
): Promise<PaymentResponse> => {
  console.log("[Stripe Backend] Creating PaymentIntent...");
  console.log(`  Amount: $${amount} ${currency.toUpperCase()}`);
  console.log(`  Championship ID: ${championshipId}`);

  if (!stripeSecretKey) {
    return {
      success: false,
      message: "Stripe Secret Key not provided",
      error: "missing_secret_key",
    };
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/api/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        championshipId,
        stripeSecretKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Stripe Backend] Error:", data.message || data.error);
      return {
        success: false,
        message: data.message || "Failed to create payment intent",
        error: data.error,
      };
    }

    console.log("[Stripe Backend] PaymentIntent created successfully!");
    return {
      success: true,
      message: "PaymentIntent created successfully",
      paymentIntentId: data.paymentIntentId,
      clientSecret: data.clientSecret,
    };

  } catch (error: any) {
    console.error("[Stripe Backend] Network error:", error.message);
    return {
      success: false,
      message: "Network error: Unable to connect to payment server",
      error: error.message,
    };
  }
};

/**
 * Legacy function name for backward compatibility.
 * Redirects to createPaymentIntent.
 * 
 * @deprecated Use createPaymentIntent instead. This function is kept for compatibility.
 */
export const processPaymentWithMockBackend = async (
  paymentMethodId: string,
  amount: number,
  currency: string,
  championshipId: string,
  stripeSecretKey: string | null
): Promise<PaymentResponse> => {
  // Note: paymentMethodId is not used in the new flow
  // The frontend will handle payment confirmation with the clientSecret
  return createPaymentIntent(amount, currency, championshipId, stripeSecretKey);
};
