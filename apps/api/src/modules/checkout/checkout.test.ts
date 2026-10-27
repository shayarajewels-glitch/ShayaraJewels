import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { setTransactionSupport, supportsTransactions } from '../../config/db';
import { CartModel, OrderModel, ProductModel } from '../../models';
import { releaseExpiredReservations } from '../../jobs';
import { Client, PASSWORD, addAddress, createProduct, registeredClient } from '../../tests/helpers';

describe('cart', () => {
  it('keeps a guest cart in the session and merges it into the account on login', async () => {
    const ring = await createProduct({ stock: 5 });
    const necklace = await createProduct({ type: 'necklace', stock: 5 });
    const { client: account, email } = await registeredClient();
    await account.post('/cart/items', { productId: ring.id, quantity: 2 });
    await account.post('/auth/logout');

    const guest = new Client();
    await guest.init();
    await guest.post('/cart/items', { productId: ring.id, quantity: 2 });
    await guest.post('/cart/items', { productId: necklace.id, quantity: 1 });
    expect((await guest.get('/cart')).body.itemCount).toBe(3);

    await guest.post('/auth/login', { email, password: PASSWORD });
    const cart = (await guest.get('/cart')).body;
    const qty = Object.fromEntries(cart.lines.map((l: { productId: string; quantity: number }) => [l.productId, l.quantity]));
    expect(qty[ring.id]).toBe(4);
    expect(qty[necklace.id]).toBe(1);
    expect(await CartModel.countDocuments({ sessionId: { $ne: null } })).toBe(0);
  });

  it('persists the authenticated cart across sessions', async () => {
    const ring = await createProduct();
    const { client, email } = await registeredClient();
    await client.post('/cart/items', { productId: ring.id, quantity: 1 });
    const other = new Client();
    await other.init();
    await other.post('/auth/login', { email, password: PASSWORD });
    expect((await other.get('/cart')).body.itemCount).toBe(1);
  });

  it('validates quantities against stock and limits', async () => {
    const ring = await createProduct({ stock: 3 });
    const { client } = await registeredClient();
    expect((await client.post('/cart/items', { productId: ring.id, quantity: 4 })).status).toBe(409);
    expect((await client.post('/cart/items', { productId: ring.id, quantity: 0 })).status).toBe(400);
    expect((await client.post('/cart/items', { productId: ring.id, quantity: 2.5 })).status).toBe(400);
    expect((await client.post('/cart/items', { productId: ring.id, quantity: 3 })).status).toBe(201);
    expect((await client.patch(`/cart/items/${ring.id}`, { quantity: 4 })).status).toBe(409);
  });

  it('refuses unpublished products and client-supplied prices', async () => {
    const draft = await createProduct({ status: 'draft' });
    const ring = await createProduct();
    const { client } = await registeredClient();
    expect((await client.post('/cart/items', { productId: draft.id })).status).toBe(404);
    expect((await client.post('/cart/items', { productId: ring.id, pricePaise: 1 })).status).toBe(400);
  });

  it('requires a size when the product has size options', async () => {
    const ring = await createProduct({ sizeOptions: ['6', '7', '8'] });
    const { client } = await registeredClient();
    expect((await client.post('/cart/items', { productId: ring.id })).status).toBe(400);
    expect((await client.post('/cart/items', { productId: ring.id, size: '9' })).status).toBe(400);
    expect((await client.post('/cart/items', { productId: ring.id, size: '7' })).status).toBe(201);
  });

  it('flags lines whose price or availability changed', async () => {
    const ring = await createProduct({ stock: 5, pricePaise: 50_000 });
    const { client } = await registeredClient();
    await client.post('/cart/items', { productId: ring.id, quantity: 4 });
    await ProductModel.updateOne({ _id: ring._id }, { stock: 2, pricePaise: 60_000 });
    const cart = (await client.get('/cart')).body;
    expect(cart.lines[0].unitPricePaise).toBe(60_000);
    expect(cart.lines[0].issue).toMatch(/Only 2 left/);
  });
});

async function readyToCheckout(stock = 10, quantity = 1, pricePaise = 99_900) {
  const product = await createProduct({ stock, pricePaise });
  const { client, email } = await registeredClient();
  const addressId = await addAddress(client);
  await client.post('/cart/items', { productId: product.id, quantity });
  return { client, email, product, addressId };
}

describe('checkout', () => {
  it('quotes totals on the server, including shipping and COD fees', async () => {
    const { client } = await readyToCheckout(10, 1, 50_000);
    const quote = (await client.post('/checkout/quote', { paymentMethod: 'razorpay' })).body;
    expect(quote.subtotalPaise).toBe(50_000);
    expect(quote.shippingPaise).toBe(7_900);
    expect(quote.totalPaise).toBe(57_900);
    const cod = (await client.post('/checkout/quote', { paymentMethod: 'cod' })).body;
    expect(cod.paymentFeePaise).toBe(4_900);
    expect(cod.totalPaise).toBe(62_800);
  });

  it('gives free shipping above the threshold', async () => {
    const { client } = await readyToCheckout(10, 1, 120_000);
    const quote = (await client.post('/checkout/quote', {})).body;
    expect(quote.shippingPaise).toBe(0);
  });

  it('creates a pending prepaid order, snapshots prices and reserves stock', async () => {
    const { client, product, addressId } = await readyToCheckout(10, 2);
    const res = await client.checkout({ addressId, paymentMethod: 'razorpay' });
    expect(res.status).toBe(201);
    const order = res.body.order;
    expect(order.status).toBe('pending_payment');
    expect(order.items[0].unitPricePaise).toBe(99_900);
    expect(order.totalPaise).toBe(199_800);
    expect(order.shippingAddress.city).toBe('Bengaluru');
    expect((await ProductModel.findById(product._id).lean())?.stock).toBe(8);
    expect((await client.get('/cart')).body.itemCount).toBe(0);

    // Later price changes do not touch the order snapshot.
    await ProductModel.updateOne({ _id: product._id }, { pricePaise: 1 });
    expect((await client.get(`/orders/${order.orderNumber}`)).body.items[0].unitPricePaise).toBe(99_900);
  });

  it('ignores client totals and rejects a stale expected total', async () => {
    const { client, addressId } = await readyToCheckout();
    const tampered = await client.checkout({ addressId, paymentMethod: 'razorpay', totalPaise: 100 });
    expect(tampered.status).toBe(400);
    const stale = await client.checkout({ addressId, paymentMethod: 'razorpay', expectedTotalPaise: 100 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('PRICE_CHANGED');
  });

  it('requires an Idempotency-Key and replays duplicates instead of creating new orders', async () => {
    const { client, addressId } = await readyToCheckout();
    const noKey = await client.post('/checkout', { addressId, paymentMethod: 'razorpay' });
    expect(noKey.status).toBe(400);

    const key = randomUUID();
    const first = await client.checkout({ addressId, paymentMethod: 'razorpay' }, key);
    const second = await client.checkout({ addressId, paymentMethod: 'razorpay' }, key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.replayed).toBe(true);
    expect(second.body.order.orderNumber).toBe(first.body.order.orderNumber);
    expect(await OrderModel.countDocuments()).toBe(1);
  });

  it('allows only one order from concurrent double-submits with different keys', async () => {
    const { client, addressId } = await readyToCheckout(10, 1);
    const results = await Promise.all([
      client.checkout({ addressId, paymentMethod: 'razorpay' }),
      client.checkout({ addressId, paymentMethod: 'razorpay' }),
      client.checkout({ addressId, paymentMethod: 'razorpay' }),
    ]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await OrderModel.countDocuments()).toBe(1);
  });

  it('never oversells under concurrent checkouts by different customers', async () => {
    const product = await createProduct({ stock: 3 });
    const buyers = await Promise.all(
      Array.from({ length: 8 }, async () => {
        const { client } = await registeredClient();
        const addressId = await addAddress(client);
        await client.post('/cart/items', { productId: product.id, quantity: 1 });
        return { client, addressId };
      }),
    );
    const results = await Promise.all(buyers.map(({ client, addressId }) => client.checkout({ addressId, paymentMethod: 'cod' })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    expect((await ProductModel.findById(product._id).lean())?.stock).toBe(0);
  });

  it('never oversells without transaction support (compensating path)', async () => {
    const original = supportsTransactions();
    setTransactionSupport(false);
    try {
      const a = await createProduct({ stock: 5 });
      const b = await createProduct({ stock: 1 });
      const buyers = await Promise.all(
        Array.from({ length: 4 }, async () => {
          const { client } = await registeredClient();
          const addressId = await addAddress(client);
          await client.post('/cart/items', { productId: a.id, quantity: 1 });
          await client.post('/cart/items', { productId: b.id, quantity: 1 });
          return { client, addressId };
        }),
      );
      const results = await Promise.all(buyers.map(({ client, addressId }) => client.checkout({ addressId, paymentMethod: 'cod' })));
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      // Failed checkouts restored the units of `a` they had already taken.
      expect((await ProductModel.findById(a._id).lean())?.stock).toBe(4);
      expect((await ProductModel.findById(b._id).lean())?.stock).toBe(0);
    } finally {
      setTransactionSupport(original);
    }
  });

  it('rejects another customer’s address', async () => {
    const { client } = await readyToCheckout();
    const { client: other } = await registeredClient();
    const foreignAddress = await addAddress(other);
    const res = await client.checkout({ addressId: foreignAddress, paymentMethod: 'cod' });
    expect(res.status).toBe(400);
  });

  it('confirms COD orders immediately and counts them as sales', async () => {
    const { client, product, addressId } = await readyToCheckout(10, 2);
    const res = await client.checkout({ addressId, paymentMethod: 'cod' });
    expect(res.body.order.status).toBe('confirmed');
    expect(res.body.order.codCollectionStatus).toBe('pending');
    expect(res.body.order.paymentStatus).toBe('pending');
    expect((await ProductModel.findById(product._id).lean())?.unitsSold).toBe(2);
  });

  it('releases reserved stock when the payment window expires', async () => {
    const { client, product, addressId } = await readyToCheckout(5, 2);
    const res = await client.checkout({ addressId, paymentMethod: 'razorpay' });
    expect((await ProductModel.findById(product._id).lean())?.stock).toBe(3);

    // Not yet expired: nothing happens.
    expect(await releaseExpiredReservations()).toBe(0);
    await OrderModel.updateOne({ orderNumber: res.body.order.orderNumber }, { paymentExpiresAt: new Date(Date.now() - 1000) });
    expect(await releaseExpiredReservations()).toBe(1);
    // Running again is a no-op: stock is restored exactly once.
    expect(await releaseExpiredReservations()).toBe(0);

    const order = (await client.get(`/orders/${res.body.order.orderNumber}`)).body;
    expect(order.status).toBe('cancelled');
    expect(order.paymentStatus).toBe('expired');
    expect((await ProductModel.findById(product._id).lean())?.stock).toBe(5);
  });

  it('lets customers cancel unshipped orders and restores stock', async () => {
    const { client, product, addressId } = await readyToCheckout(5, 1);
    const res = await client.checkout({ addressId, paymentMethod: 'cod' });
    const cancel = await client.post(`/orders/${res.body.order.orderNumber}/cancel`, { reason: 'Changed my mind' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');
    const p = await ProductModel.findById(product._id).lean();
    expect(p?.stock).toBe(5);
    expect(p?.unitsSold).toBe(0);
    expect((await client.post(`/orders/${res.body.order.orderNumber}/cancel`, {})).status).toBe(409);
  });

  it('hides other customers’ orders', async () => {
    const { client, addressId } = await readyToCheckout();
    const res = await client.checkout({ addressId, paymentMethod: 'cod' });
    const { client: other } = await registeredClient();
    expect((await other.get(`/orders/${res.body.order.orderNumber}`)).status).toBe(404);
    expect((await other.post(`/orders/${res.body.order.orderNumber}/cancel`, {})).status).toBe(404);
    expect((await other.get('/orders')).body.items).toHaveLength(0);
  });
});
