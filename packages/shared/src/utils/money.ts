import {
  COD_FEE_PAISE,
  FREE_SHIPPING_THRESHOLD_PAISE,
  STANDARD_SHIPPING_PAISE,
  type PaymentMethod,
} from '../constants/commerce';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats an integer paise amount as Indian rupees, e.g. 129900 -> "₹1,299". */
export function formatPaise(paise: number): string {
  return inrFormatter.format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function shippingForSubtotal(subtotalPaise: number): number {
  if (subtotalPaise <= 0) return 0;
  return subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : STANDARD_SHIPPING_PAISE;
}

export function paymentFeeFor(method: PaymentMethod): number {
  return method === 'cod' ? COD_FEE_PAISE : 0;
}

export function discountPercent(pricePaise: number, compareAtPaise?: number | null): number | null {
  if (!compareAtPaise || compareAtPaise <= pricePaise) return null;
  return Math.round(((compareAtPaise - pricePaise) / compareAtPaise) * 100);
}
