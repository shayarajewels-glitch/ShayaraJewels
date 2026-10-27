import { Schema, model, type Types } from 'mongoose';

export const WEBHOOK_STATUSES = ['processing', 'processed', 'ignored', 'failed'] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];

export interface WebhookEvent {
  _id: Types.ObjectId;
  provider: 'razorpay';
  eventId: string;
  eventType: string;
  status: WebhookStatus;
  attempts: number;
  payloadSha256: string;
  error?: string | null;
  receivedAt: Date;
  processedAt?: Date | null;
}

const webhookEventSchema = new Schema<WebhookEvent>({
  provider: { type: String, enum: ['razorpay'], required: true },
  eventId: { type: String, required: true, maxlength: 100 },
  eventType: { type: String, required: true, maxlength: 100 },
  status: { type: String, enum: WEBHOOK_STATUSES, required: true },
  attempts: { type: Number, default: 1 },
  payloadSha256: { type: String, required: true },
  error: { type: String, default: null, maxlength: 500 },
  receivedAt: { type: Date, required: true },
  processedAt: { type: Date, default: null },
});

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ status: 1, receivedAt: -1 });

export const WebhookEventModel = model<WebhookEvent>('WebhookEvent', webhookEventSchema);
