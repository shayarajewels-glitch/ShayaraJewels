import { describe, expect, it } from 'vitest';
import { InventoryAdjustmentModel, MediaAssetModel, OrderModel, ProductModel } from '../../models';
import { Client, adminClient, createProduct, registeredClient } from '../../tests/helpers';

const publicClient = async () => {
  const c = new Client();
  await c.init();
  return c;
};

describe('public catalogue', () => {
  it('lists only published products and hides internal fields', async () => {
    await createProduct({ name: 'Published Ring' });
    await createProduct({ name: 'Draft Ring', status: 'draft' });
    await createProduct({ name: 'Archived Ring', status: 'archived' });
    const c = await publicClient();
    const res = await c.get('/products');
    expect(res.status).toBe(200);
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(['Published Ring']);
    expect(res.body.items[0]).not.toHaveProperty('stock');
    expect(res.body.items[0]).not.toHaveProperty('sku');
    expect(res.body.items[0]).not.toHaveProperty('status');
  });

  it('returns 404 for unpublished product slugs', async () => {
    const draft = await createProduct({ status: 'draft' });
    const c = await publicClient();
    expect((await c.get(`/products/${draft.slug}`)).status).toBe(404);
  });

  it('filters by type, finish, price range and availability', async () => {
    await createProduct({ name: 'Gold Ring', type: 'ring', finish: 'gold', pricePaise: 50_000 });
    await createProduct({ name: 'Silver Ring', type: 'ring', finish: 'silver', pricePaise: 150_000 });
    await createProduct({ name: 'Rose Anklet', type: 'anklet', finish: 'rose-gold', pricePaise: 80_000, stock: 0 });
    const c = await publicClient();
    const names = async (qs: string) =>
      ((await c.get(`/products?${qs}`)).body.items as { name: string }[]).map((p) => p.name).sort();

    expect(await names('type=ring')).toEqual(['Gold Ring', 'Silver Ring']);
    expect(await names('finish=silver,rose-gold')).toEqual(['Rose Anklet', 'Silver Ring']);
    expect(await names('minPrice=600&maxPrice=1000')).toEqual(['Rose Anklet']);
    expect(await names('inStock=true')).toEqual(['Gold Ring', 'Silver Ring']);
  });

  it('sorts by price, newest, bestsellers and top rated', async () => {
    await createProduct({ name: 'B', pricePaise: 20_000, unitsSold: 5 });
    await createProduct({ name: 'A', pricePaise: 10_000, unitsSold: 50, averageRating: 4.9, reviewCount: 12, ratingScore: 4.9 });
    await createProduct({ name: 'C', pricePaise: 30_000, unitsSold: 1, averageRating: 5, reviewCount: 1, ratingScore: 0 });
    const c = await publicClient();
    const order = async (sort: string) => ((await c.get(`/products?sort=${sort}`)).body.items as { name: string }[]).map((p) => p.name);
    expect(await order('price-asc')).toEqual(['A', 'B', 'C']);
    expect(await order('price-desc')).toEqual(['C', 'B', 'A']);
    expect(await order('new')).toEqual(['C', 'A', 'B']);
    expect(await order('bestsellers')).toEqual(['A', 'B', 'C']);
    // C has a perfect score from one review, but needs the minimum review count to rank.
    expect((await order('top-rated'))[0]).toBe('A');
  });

  it('paginates', async () => {
    for (let i = 0; i < 5; i++) await createProduct();
    const c = await publicClient();
    const res = await c.get('/products?limit=2&page=3');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(5);
    expect(res.body.totalPages).toBe(3);
  });

  it('rejects invalid query parameters', async () => {
    const c = await publicClient();
    expect((await c.get('/products?finish=platinum')).status).toBe(400);
    expect((await c.get('/products?limit=1000')).status).toBe(400);
    expect((await c.get('/products?sort=random')).status).toBe(400);
  });

  it('searches names, keywords and partial words', async () => {
    await createProduct({ name: 'Celestial Moon Pendant', type: 'pendant', searchKeywords: ['crescent'] });
    await createProduct({ name: 'Classic Band' });
    const c = await publicClient();
    const search = async (q: string) => ((await c.get(`/search?q=${encodeURIComponent(q)}`)).body.items as { name: string }[]).map((p) => p.name);
    expect(await search('moon')).toEqual(['Celestial Moon Pendant']);
    expect(await search('crescent')).toEqual(['Celestial Moon Pendant']);
    expect(await search('celest')).toEqual(['Celestial Moon Pendant']);
    expect(await search('pendant')).toEqual(['Celestial Moon Pendant']);
    expect(await search('.*')).toEqual([]);
  });

  it('labels bestseller and top-rated collections as fallback when data is insufficient', async () => {
    await createProduct({ name: 'Featured', featured: true });
    const c = await publicClient();
    const best = await c.get('/products/bestsellers');
    expect(best.body.fallback).toBe(true);
    expect(best.body.items[0].name).toBe('Featured');
    await ProductModel.updateOne({ name: 'Featured' }, { unitsSold: 3 });
    expect((await c.get('/products/bestsellers')).body.fallback).toBe(false);
  });

  it('reports category counts from published products', async () => {
    await createProduct({ type: 'necklace' });
    await createProduct({ type: 'necklace', status: 'draft' });
    const c = await publicClient();
    const res = await c.get('/categories');
    const necklaces = res.body.items.find((x: { slug: string }) => x.slug === 'necklaces');
    expect(necklaces.productCount).toBe(1);
  });
});

const validProduct = {
  name: 'Aria Layered Necklace',
  sku: 'NCK-ARIA-01',
  description: 'Two delicate layered chains with a gold-tone finish over brass.',
  type: 'necklace',
  finish: 'gold',
  baseMaterial: 'Brass',
  pricePaise: 149_900,
  compareAtPricePaise: 199_900,
  stock: 12,
  images: [{ url: '/images/products/aria.svg', alt: 'Aria necklace on ivory', sortOrder: 0 }],
  status: 'published',
};

describe('admin product management', () => {
  it('creates a product with an auto-generated slug and shows it publicly', async () => {
    const admin = await adminClient();
    const res = await admin.post('/admin/products', validProduct);
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('aria-layered-necklace');
    expect(res.body.averageRating).toBe(0);
    const pub = await (await publicClient()).get('/products/aria-layered-necklace');
    expect(pub.status).toBe(200);
    expect(pub.body.compareAtPricePaise).toBe(199_900);
  });

  it('rejects duplicate SKUs and invalid prices', async () => {
    const admin = await adminClient();
    await admin.post('/admin/products', validProduct);
    const dup = await admin.post('/admin/products', { ...validProduct, name: 'Other name' });
    expect(dup.status).toBe(409);
    const bad = await admin.post('/admin/products', { ...validProduct, sku: 'NCK-2', compareAtPricePaise: 100 });
    expect(bad.status).toBe(400);
    const fraction = await admin.post('/admin/products', { ...validProduct, sku: 'NCK-3', pricePaise: 999.5 });
    expect(fraction.status).toBe(400);
  });

  it('refuses to publish without images', async () => {
    const admin = await adminClient();
    const res = await admin.post('/admin/products', { ...validProduct, images: [] });
    expect(res.status).toBe(400);
  });

  it('does not accept rating, sales or stock through the general update', async () => {
    const admin = await adminClient();
    const created = await admin.post('/admin/products', validProduct);
    const res = await admin.patch(`/admin/products/${created.body.id}`, { averageRating: 5 });
    expect(res.status).toBe(400);
    const stock = await admin.patch(`/admin/products/${created.body.id}`, { stock: 999 });
    expect(stock.status).toBe(400);
  });

  it('publishes, unpublishes and reorders images', async () => {
    const admin = await adminClient();
    const created = await admin.post('/admin/products', { ...validProduct, status: 'draft' });
    const id = created.body.id;
    const res = await admin.patch(`/admin/products/${id}`, {
      status: 'published',
      images: [
        { url: '/images/products/b.svg', alt: 'Second angle', sortOrder: 5 },
        { url: '/images/products/a.svg', alt: 'First angle', sortOrder: 1 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.images.map((i: { alt: string; sortOrder: number }) => [i.alt, i.sortOrder])).toEqual([
      ['First angle', 0],
      ['Second angle', 1],
    ]);
    const off = await admin.patch(`/admin/products/${id}`, { status: 'draft' });
    expect(off.body.status).toBe('draft');
    expect((await (await publicClient()).get(`/products/${res.body.slug}`)).status).toBe(404);
  });

  it('rejects media from arbitrary hosts and unknown upload keys', async () => {
    const admin = await adminClient();
    const host = await admin.post('/admin/products', {
      ...validProduct,
      images: [{ url: 'https://evil.example/x.jpg', alt: 'Hotlinked', sortOrder: 0 }],
    });
    expect(host.status).toBe(400);
    const key = await admin.post('/admin/products', {
      ...validProduct,
      images: [{ url: 'https://abc123.ufs.sh/f/key1', key: 'key1', alt: 'Unknown key', sortOrder: 0 }],
    });
    expect(key.status).toBe(400);
  });

  it('attaches tracked uploads and releases them when removed', async () => {
    const admin = await adminClient();
    const me = await admin.get('/auth/me');
    await MediaAssetModel.create({ key: 'k-1', url: 'https://abc123.ufs.sh/f/k-1', kind: 'image', uploadedBy: me.body.user.id });
    const created = await admin.post('/admin/products', {
      ...validProduct,
      images: [{ url: 'https://abc123.ufs.sh/f/k-1', key: 'k-1', alt: 'Uploaded image', sortOrder: 0 }],
    });
    expect(created.status).toBe(201);
    expect((await MediaAssetModel.findOne({ key: 'k-1' }).lean())?.status).toBe('attached');

    await admin.patch(`/admin/products/${created.body.id}`, { images: [{ url: '/images/products/a.svg', alt: 'Replacement', sortOrder: 0 }] });
    expect((await MediaAssetModel.findOne({ key: 'k-1' }).lean())?.status).toBe('deleted');
  });

  it('adjusts stock atomically and never below zero', async () => {
    const admin = await adminClient();
    const created = await admin.post('/admin/products', validProduct);
    const id = created.body.id;
    expect((await admin.patch(`/admin/products/${id}/stock`, { adjust: -5, reason: 'Damaged' })).body.stock).toBe(7);
    expect((await admin.patch(`/admin/products/${id}/stock`, { adjust: -8 })).status).toBe(400);
    expect((await admin.patch(`/admin/products/${id}/stock`, { set: 30 })).body.stock).toBe(30);
    expect(await InventoryAdjustmentModel.countDocuments({ productId: id })).toBe(2);
  });

  it('archives ordered products instead of deleting them', async () => {
    const admin = await adminClient();
    const a = await admin.post('/admin/products', validProduct);
    const b = await admin.post('/admin/products', { ...validProduct, sku: 'NCK-B', name: 'Never Ordered' });
    const { user } = await registeredClient();
    await OrderModel.collection.insertOne({ orderNumber: 'SHY-000000-AAAAAA', userId: user.id, items: [{ productId: new ProductModel({ _id: a.body.id })._id }] });
    expect((await admin.delete(`/admin/products/${a.body.id}`)).body.result).toBe('archived');
    expect((await admin.delete(`/admin/products/${b.body.id}`)).body.result).toBe('deleted');
    expect(await ProductModel.countDocuments()).toBe(1);
  });

  it('reports that uploads are not configured without leaking configuration', async () => {
    const admin = await adminClient();
    const cfg = await admin.get('/admin/uploads/config');
    expect(cfg.body.enabled).toBe(false);
    const token = await admin.post('/admin/uploads/token');
    expect(token.status).toBe(503);
    expect(token.body.error.code).toBe('UPLOADS_NOT_CONFIGURED');
  });
});
