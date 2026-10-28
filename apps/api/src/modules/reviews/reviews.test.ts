import { describe, expect, it } from 'vitest';
import { OrderModel, ProductModel } from '../../models';
import { addAddress, adminClient, createProduct, registeredClient } from '../../tests/helpers';

async function customerWithOrder(status: 'confirmed' | 'delivered') {
  const product = await createProduct();
  const { client } = await registeredClient({ name: 'Priya Nair' });
  const addressId = await addAddress(client);
  await client.post('/cart/items', { productId: product.id, quantity: 1 });
  const res = await client.checkout({ addressId, paymentMethod: 'cod' });
  if (status === 'delivered') {
    await OrderModel.updateOne({ orderNumber: res.body.order.orderNumber }, { status: 'delivered', deliveredAt: new Date() });
  }
  return { client, product, orderNumber: res.body.order.orderNumber as string };
}

const review = { rating: 5, title: 'Beautiful finish', comment: 'Looks lovely and has not tarnished after a month.' };

describe('reviews', () => {
  it('requires a delivered purchase of the product', async () => {
    const product = await createProduct();
    const { client: stranger } = await registeredClient();
    expect((await stranger.post(`/products/${product.id}/reviews`, review)).status).toBe(403);

    const { client, product: ordered } = await customerWithOrder('confirmed');
    const res = await client.post(`/products/${ordered.id}/reviews`, review);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_VERIFIED_PURCHASE');
  });

  it('publishes one review per product immediately and lets admins hide it', async () => {
    const { client, product, orderNumber } = await customerWithOrder('delivered');
    const order = (await client.get(`/orders/${orderNumber}`)).body;
    expect(order.reviewableProductIds).toContain(product.id);

    const created = await client.post(`/products/${product.id}/reviews`, review);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('approved');
    expect(created.body.authorName).toBe('Priya N.');
    expect((await client.post(`/products/${product.id}/reviews`, review)).status).toBe(409);

    // Public and counted straight away.
    const p = await ProductModel.findById(product._id).lean();
    expect(p?.reviewCount).toBe(1);
    expect(p?.averageRating).toBe(5);
    expect(p?.ratingScore).toBe(0); // below the top-rated minimum
    const pub = (await client.get(`/products/${product.id}/reviews`)).body;
    expect(pub.items).toHaveLength(1);
    expect(pub.distribution[5]).toBe(1);

    // Edits stay published and update the aggregate.
    await client.patch(`/reviews/${created.body.id}`, { rating: 3 });
    expect((await ProductModel.findById(product._id).lean())?.averageRating).toBe(3);

    // Rejecting hides it and removes it from the aggregate; later edits keep it hidden.
    const admin = await adminClient();
    expect((await admin.patch(`/admin/reviews/${created.body.id}`, { status: 'rejected' })).status).toBe(200);
    expect((await ProductModel.findById(product._id).lean())?.reviewCount).toBe(0);
    await client.patch(`/reviews/${created.body.id}`, { rating: 4 });
    expect((await client.get(`/products/${product.id}/reviews`)).body.items).toHaveLength(0);
  });

  it('validates rating values', async () => {
    const { client, product } = await customerWithOrder('delivered');
    expect((await client.post(`/products/${product.id}/reviews`, { ...review, rating: 6 })).status).toBe(400);
    expect((await client.post(`/products/${product.id}/reviews`, { ...review, rating: 4.5 })).status).toBe(400);
  });

  it('prevents editing or deleting someone else’s review', async () => {
    const { client, product } = await customerWithOrder('delivered');
    const created = await client.post(`/products/${product.id}/reviews`, review);
    const { client: other } = await registeredClient();
    expect((await other.patch(`/reviews/${created.body.id}`, { rating: 1 })).status).toBe(403);
    expect((await other.delete(`/reviews/${created.body.id}`)).status).toBe(403);
  });
});

describe('admin order management', () => {
  it('moves orders through allowed fulfilment states only', async () => {
    const { client, orderNumber } = await customerWithOrder('confirmed');
    const admin = await adminClient();
    const id = (await OrderModel.findOne({ orderNumber }).lean())!._id.toString();

    expect((await admin.patch(`/admin/orders/${id}/status`, { status: 'delivered' })).status).toBe(409);
    expect((await admin.patch(`/admin/orders/${id}/status`, { status: 'shipped' })).status).toBe(400); // tracking required
    const shipped = await admin.patch(`/admin/orders/${id}/status`, {
      status: 'shipped',
      tracking: { carrier: 'Delhivery', trackingNumber: 'DL123456789' },
    });
    expect(shipped.status).toBe(200);
    expect(shipped.body.tracking.carrier).toBe('Delhivery');

    const delivered = await admin.patch(`/admin/orders/${id}/status`, { status: 'delivered', codCollected: true });
    expect(delivered.body.status).toBe('delivered');
    expect(delivered.body.codCollectionStatus).toBe('collected');
    expect(delivered.body.paymentStatus).toBe('paid');

    const customerView = (await client.get(`/orders/${orderNumber}`)).body;
    expect(customerView.canRequestReturn).toBe(true);
    expect(customerView.timeline.map((t: { status: string }) => t.status)).toEqual(['confirmed', 'shipped', 'delivered']);
  });

  it('handles return requests within the window', async () => {
    const { client, product, orderNumber } = await customerWithOrder('delivered');
    const res = await client.post(`/orders/${orderNumber}/return-request`, { reason: 'The clasp arrived broken.' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('return_requested');
    expect((await client.post(`/orders/${orderNumber}/return-request`, { reason: 'Again please, again.' })).status).toBe(409);

    const admin = await adminClient();
    const id = (await OrderModel.findOne({ orderNumber }).lean())!._id.toString();
    const returned = await admin.patch(`/admin/orders/${id}/status`, { status: 'returned', restock: true });
    expect(returned.body.status).toBe('returned');
    const p = await ProductModel.findById(product._id).lean();
    expect(p?.stock).toBe(10);
    expect(p?.unitsSold).toBe(0);
  });

  it('rejects returns after the window', async () => {
    const { client, orderNumber } = await customerWithOrder('delivered');
    await OrderModel.updateOne({ orderNumber }, { deliveredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) });
    expect((await client.post(`/orders/${orderNumber}/return-request`, { reason: 'Too late for this one.' })).status).toBe(409);
  });

  it('shows dashboard metrics from real orders', async () => {
    await customerWithOrder('confirmed');
    const admin = await adminClient();
    const res = await admin.get('/admin/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.orderCount).toBe(1);
    expect(res.body.grossSalesPaise).toBe(99_900 + 4_900);
    expect(res.body.statusSummary.confirmed).toBe(1);
    expect(res.body.recentOrders[0].customer.name).toBe('Priya Nair');
  });

  it('does not let customers refund or change status', async () => {
    const { client, orderNumber } = await customerWithOrder('confirmed');
    const id = (await OrderModel.findOne({ orderNumber }).lean())!._id.toString();
    expect((await client.patch(`/admin/orders/${id}/status`, { status: 'shipped' })).status).toBe(403);
    expect((await client.post(`/admin/orders/${id}/refund`, { reason: 'please' })).status).toBe(403);
  });
});
