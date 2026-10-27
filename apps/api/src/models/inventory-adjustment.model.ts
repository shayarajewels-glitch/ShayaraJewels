import { Schema, model, type Types } from 'mongoose';

/** Audit trail for manual stock changes made by administrators. */
export interface InventoryAdjustment {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  delta: number;
  resultingStock: number;
  reason?: string | null;
  adminId: Types.ObjectId;
  createdAt: Date;
}

const inventoryAdjustmentSchema = new Schema<InventoryAdjustment>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    delta: { type: Number, required: true },
    resultingStock: { type: Number, required: true },
    reason: { type: String, maxlength: 200, default: null },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

inventoryAdjustmentSchema.index({ productId: 1, createdAt: -1 });

export const InventoryAdjustmentModel = model<InventoryAdjustment>('InventoryAdjustment', inventoryAdjustmentSchema);
