import { getConfig } from '../config/env';

/** Startup summary of optional integrations. States only whether each is configured, never the values. */
export function describeIntegrations(): string[] {
  const c = getConfig();
  const razorpay = Boolean(c.payments.keyId && c.payments.keySecret);
  const lines = [
    `Payments: ${c.payments.provider === 'mock' ? 'mock gateway (test only)' : razorpay ? `Razorpay (${c.payments.keyId?.startsWith('rzp_live_') ? 'LIVE' : 'test'} mode)` : 'Razorpay NOT configured — online payments disabled, COD only'}`,
    `Razorpay webhooks: ${c.payments.webhookSecret ? 'enabled' : 'NOT configured — webhook requests will be rejected'}`,
    `Media uploads: ${c.uploadthing.token ? 'UploadThing configured' : 'UploadThing NOT configured — uploads disabled, use media URLs'}`,
    `Email: ${c.mail.transport}${c.mail.transport === 'disabled' ? ' — password reset and verification emails will not be sent' : ''}`,
  ];
  return lines;
}
