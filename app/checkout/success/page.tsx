/**
 * Checkout success page (Server Component)
 * Shown after successful Stripe payment
 */

import { Suspense } from 'react';
import CheckoutSuccessPageClient from './success-client';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutSuccessPageClient />
    </Suspense>
  );
}
