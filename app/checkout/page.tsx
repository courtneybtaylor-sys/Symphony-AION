/**
 * Checkout page (Server Component)
 * Displays purchase summary before Stripe checkout redirect
 */

import { Suspense } from 'react';
import CheckoutPageClient from './checkout-client';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutPageClient />
    </Suspense>
  );
}
