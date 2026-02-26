/**
 * Stripe integration helpers and constants
 * Payment processing for Symphony-AION audits
 */

// In production, initialize with real Stripe key
// For test mode, use sk_test_... key
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const AUDIT_PRICE_USD = 750_00; // in cents ($750.00)
export const REPORT_EXPIRY_HOURS = 24;

/**
 * Get Stripe client instance
 * Lazy initialization to avoid issues in non-server contexts
 */
let stripeInstance: any = null;

export function getStripeClient() {
  if (!stripeInstance) {
    try {
      const Stripe = require('stripe');
      stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
      });
    } catch (error) {
      console.error('Failed to initialize Stripe client:', error);
      throw new Error('Stripe client initialization failed');
    }
  }
  return stripeInstance;
}

/**
 * Pricing constants
 */
export const PRICING = {
  PROFESSIONAL: {
    id: 'price_professional',
    amount: AUDIT_PRICE_USD,
    currency: 'usd',
    interval: null, // one-time
    description: '$750 per forensic audit',
  },
  ENTERPRISE: {
    id: 'price_enterprise',
    amount: 150000, // $1,500/month
    currency: 'usd',
    interval: 'month',
    description: '$1,500/month unlimited audits',
  },
} as const;

/**
 * Test card numbers for Stripe test mode
 * Only works in test mode, not production
 */
export const TEST_CARDS = {
  VISA_SUCCESS: '4242424242424242',
  VISA_DECLINE: '4000000000000002',
  AMEX_SUCCESS: '378282246310005',
} as const;
