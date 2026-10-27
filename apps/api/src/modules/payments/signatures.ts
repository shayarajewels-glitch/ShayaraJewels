import { hmacSha256Hex, safeEqual } from '../../utils/crypto';

/**
 * Razorpay Standard Checkout signature:
 * HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret).
 * The order id must be the one stored on our server, not the client's copy.
 */
export function checkoutSignature(orderId: string, paymentId: string, keySecret: string): string {
  return hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
}

export function verifyCheckoutSignature(params: {
  storedOrderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  return safeEqual(checkoutSignature(params.storedOrderId, params.paymentId, params.keySecret), params.signature);
}

/** Razorpay webhook signature: HMAC_SHA256 of the exact raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined, webhookSecret: string): boolean {
  if (!signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return safeEqual(hmacSha256Hex(webhookSecret, rawBody), signature);
}
