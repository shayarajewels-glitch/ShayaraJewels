import { Schema, model, type Types } from 'mongoose';

export interface CartItem {
  productId: Types.ObjectId;
  quantity: number;
  size?: string | null;
  addedAt: Date;
}

/** A cart belongs to a user, or to an anonymous session (guest cart) until login. */
export interface Cart {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  sessionId?: Types.ObjectId | null;
  items: CartItem[];
  /** Set while a checkout is being created to block concurrent checkouts of the same cart. */
  checkoutLock?: { key: string; at: Date } | null;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    size: { type: String, default: null, maxlength: 30 },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const cartSchema = new Schema<Cart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    items: { type: [cartItemSchema], default: [] },
    checkoutLock: {
      type: new Schema({ key: String, at: Date }, { _id: false }),
      default: null,
    },
  },
  { timestamps: true },
);

cartSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } });
cartSchema.index({ sessionId: 1 }, { unique: true, partialFilterExpression: { sessionId: { $type: 'objectId' } } });
// Abandoned guest carts are removed after 30 days of inactivity.
cartSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { sessionId: { $type: 'objectId' } }, name: 'guest_cart_ttl' },
);

export const CartModel = model<Cart>('Cart', cartSchema);
