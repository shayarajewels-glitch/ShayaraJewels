import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/api-server', () => ({ serverApi: {} }));

const { hasNonIndexableParams, toListingQuery } = await import('@/components/product/catalogue-listing');
const { safeNext } = await import('@/hooks/use-api-form');

describe('listing query handling', () => {
  it('keeps only known parameters and forces the category type', () => {
    const qs = toListingQuery({ finish: 'gold', evil: '1', type: 'anklet', sort: 'price-asc' }, 'ring');
    expect(qs.get('evil')).toBeNull();
    expect(qs.get('type')).toBe('ring');
    expect(qs.get('finish')).toBe('gold');
    expect(qs.get('limit')).toBe('12');
  });

  it('marks filtered and sorted listings as non-indexable but not plain pagination', () => {
    expect(hasNonIndexableParams({ page: '2' })).toBe(false);
    expect(hasNonIndexableParams({ finish: 'gold' })).toBe(true);
    expect(hasNonIndexableParams({ sort: 'new' })).toBe(true);
  });
});

describe('safeNext', () => {
  it('only allows same-site relative redirects', () => {
    expect(safeNext('/account/orders')).toBe('/account/orders');
    expect(safeNext('https://evil.example')).toBe('/account/profile');
    expect(safeNext('//evil.example')).toBe('/account/profile');
    expect(safeNext('/\\evil.example')).toBe('/account/profile');
    expect(safeNext(null, '/admin')).toBe('/admin');
  });
});
