import type { Request, Response } from 'express';
import { Types, type HydratedDocument } from 'mongoose';
import { MAX_CART_LINES, MAX_QUANTITY_PER_ITEM, type CartDto, type CartLineDto } from '@shayara/shared';
import { isDuplicateKeyError } from '../../config/db';
import { CartModel, ProductModel, type Cart, type Product } from '../../models';
import { AppError, badRequest, notFound } from '../../utils/errors';
import { ensureSession } from '../auth/session.service';

export type CartOwner = { userId: Types.ObjectId } | { sessionId: Types.ObjectId };
type CartDoc = HydratedDocument<Cart>;

/** Logged-in users own their cart; guests get a cart tied to their anonymous session. */
export async function resolveCartOwner(req: Request, res: Response): Promise<CartOwner> {
  if (req.auth.user) return { userId: req.auth.user._id };
  const session = await ensureSession(req, res);
  return { sessionId: session._id };
}

export async function findCart(owner: CartOwner): Promise<CartDoc | null> {
  return CartModel.findOne(owner);
}

export async function getOrCreateCart(owner: CartOwner): Promise<CartDoc> {
  const existing = await CartModel.findOne(owner);
  if (existing) return existing;
  try {
    return await CartModel.create({ ...owner, items: [] });
  } catch (err) {
    // Two concurrent requests both tried to create the cart.
    if (isDuplicateKeyError(err)) return (await CartModel.findOne(owner))!;
    throw err;
  }
}

function sortedFirstImage(p: Product) {
  const img = [...p.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return img ? { url: img.url, alt: img.alt, sortOrder: img.sortOrder } : null;
}

/** Prices, stock and availability always come from the database, never from the client. */
export async function buildCartLines(items: Cart['items']): Promise<CartLineDto[]> {
  if (items.length === 0) return [];
  const products = await ProductModel.find({ _id: { $in: items.map((i) => i.productId) } }).lean<Product[]>();
  const byId = new Map(products.map((p) => [p._id.toString(), p]));
  return items.map((item) => {
    const p = byId.get(item.productId.toString());
    if (!p) {
      return {
        productId: item.productId.toString(),
        slug: '',
        name: 'Unavailable product',
        sku: '',
        finish: 'gold',
        type: 'ring',
        image: null,
        size: item.size ?? null,
        quantity: item.quantity,
        unitPricePaise: 0,
        compareAtPricePaise: null,
        lineTotalPaise: 0,
        availableStock: 0,
        issue: 'This product is no longer available',
      } satisfies CartLineDto;
    }
    let issue: string | null = null;
    if (p.status !== 'published') issue = 'This product is no longer available';
    else if (p.stock <= 0) issue = 'Out of stock';
    else if (item.quantity > p.stock) issue = `Only ${p.stock} left — please reduce the quantity`;
    else if (p.sizeOptions.length > 0 && (!item.size || !p.sizeOptions.includes(item.size))) issue = 'Please choose a size';
    return {
      productId: p._id.toString(),
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      finish: p.finish,
      type: p.type,
      image: sortedFirstImage(p),
      size: item.size ?? null,
      quantity: item.quantity,
      unitPricePaise: p.pricePaise,
      compareAtPricePaise: p.compareAtPricePaise ?? null,
      lineTotalPaise: p.pricePaise * item.quantity,
      availableStock: p.status === 'published' ? p.stock : 0,
      issue,
    };
  });
}

export async function toCartDto(cart: Cart | null): Promise<CartDto> {
  const lines = await buildCartLines(cart?.items ?? []);
  const purchasable = lines.filter((l) => !l.issue);
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalPaise: purchasable.reduce((sum, l) => sum + l.lineTotalPaise, 0),
  };
}

async function loadPurchasableProduct(productId: string | Types.ObjectId): Promise<Product> {
  const product = await ProductModel.findOne({ _id: productId, status: 'published' }).lean<Product>();
  if (!product) throw notFound('This product is not available');
  return product;
}

function validateSize(product: Product, size: string | undefined | null): string | null {
  if (product.sizeOptions.length === 0) return null;
  if (!size) throw badRequest('Please choose a size', 'SIZE_REQUIRED');
  if (!product.sizeOptions.includes(size)) throw badRequest('That size is not available', 'INVALID_SIZE');
  return size;
}

function assertQuantityAvailable(product: Product, quantity: number): void {
  if (product.stock <= 0) throw new AppError(409, 'OUT_OF_STOCK', `${product.name} is out of stock`);
  if (quantity > product.stock) {
    throw new AppError(409, 'INSUFFICIENT_STOCK', `Only ${product.stock} of ${product.name} available`);
  }
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    throw badRequest(`You can buy at most ${MAX_QUANTITY_PER_ITEM} of an item`, 'QUANTITY_LIMIT');
  }
}

export async function addItem(owner: CartOwner, input: { productId: string; quantity: number; size?: string }) {
  const product = await loadPurchasableProduct(input.productId);
  const size = validateSize(product, input.size);
  const cart = await getOrCreateCart(owner);
  const existing = cart.items.find((i) => i.productId.equals(product._id));
  const quantity = (existing?.quantity ?? 0) + input.quantity;
  assertQuantityAvailable(product, quantity);
  if (existing) {
    existing.quantity = quantity;
    existing.size = size;
  } else {
    if (cart.items.length >= MAX_CART_LINES) throw badRequest('Your bag is full. Remove an item to add more.', 'CART_FULL');
    cart.items.push({ productId: product._id, quantity, size, addedAt: new Date() });
  }
  await cart.save();
  return cart;
}

export async function updateItem(owner: CartOwner, productId: string, input: { quantity: number; size?: string }) {
  const cart = await findCart(owner);
  const item = cart?.items.find((i) => i.productId.toString() === productId);
  if (!cart || !item) throw notFound('Item is not in your bag');
  const product = await loadPurchasableProduct(productId);
  assertQuantityAvailable(product, input.quantity);
  item.quantity = input.quantity;
  if (input.size !== undefined) item.size = validateSize(product, input.size);
  await cart.save();
  return cart;
}

export async function removeItem(owner: CartOwner, productId: string) {
  const cart = await CartModel.findOneAndUpdate(
    owner,
    { $pull: { items: { productId: new Types.ObjectId(productId) } } },
    { returnDocument: 'after' },
  );
  return cart;
}

export async function clearCart(owner: CartOwner) {
  await CartModel.updateOne(owner, { $set: { items: [], checkoutLock: null } });
}

/**
 * Moves a guest cart into the user's cart after login/registration. Quantities
 * are combined and capped by stock and the per-item limit.
 */
export async function mergeGuestCartIntoUser(sessionId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
  const guest = await CartModel.findOne({ sessionId });
  if (!guest) return;
  if (guest.items.length > 0) {
    const userCart = await getOrCreateCart({ userId });
    const products = await ProductModel.find({ _id: { $in: guest.items.map((i) => i.productId) }, status: 'published' })
      .select('stock')
      .lean<Pick<Product, '_id' | 'stock'>[]>();
    const stockById = new Map(products.map((p) => [p._id.toString(), p.stock]));
    for (const item of guest.items) {
      const stock = stockById.get(item.productId.toString());
      if (stock === undefined || stock <= 0) continue;
      const existing = userCart.items.find((i) => i.productId.equals(item.productId));
      const combined = Math.min((existing?.quantity ?? 0) + item.quantity, MAX_QUANTITY_PER_ITEM, stock);
      if (existing) {
        existing.quantity = combined;
        if (item.size) existing.size = item.size;
      } else if (userCart.items.length < MAX_CART_LINES) {
        userCart.items.push({ productId: item.productId, quantity: combined, size: item.size ?? null, addedAt: item.addedAt });
      }
    }
    await userCart.save();
  }
  await guest.deleteOne();
}
