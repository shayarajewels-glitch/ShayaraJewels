import { Schema, model, type Types } from 'mongoose';

/** Tracks every uploaded file so uploads that never get attached to a product can be cleaned up. */
export interface MediaAsset {
  _id: Types.ObjectId;
  key: string;
  url: string;
  kind: 'image' | 'video';
  name?: string;
  size?: number;
  uploadedBy: Types.ObjectId;
  status: 'pending' | 'attached' | 'deleted';
  productId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<MediaAsset>(
  {
    key: { type: String, required: true, maxlength: 200 },
    url: { type: String, required: true, maxlength: 2048 },
    kind: { type: String, enum: ['image', 'video'], required: true },
    name: { type: String, maxlength: 200 },
    size: Number,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'attached', 'deleted'], default: 'pending' },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  },
  { timestamps: true },
);

mediaAssetSchema.index({ key: 1 }, { unique: true });
mediaAssetSchema.index({ status: 1, createdAt: 1 });

export const MediaAssetModel = model<MediaAsset>('MediaAsset', mediaAssetSchema);
