import { describe, expect, it } from 'vitest';
import { addressSchema, updateAddressSchema } from './schemas/address';
import { registerSchema } from './schemas/auth';
import { phoneSchema } from './schemas/common';
import { createProductSchema, productQuerySchema } from './schemas/product';
import { discountPercent, formatPaise, shippingForSubtotal } from './utils/money';
import { slugify } from './utils/slug';

describe('money', () => {
  it('formats paise as rupees', () => {
    expect(formatPaise(129_900)).toBe('₹1,299');
    expect(formatPaise(12_345_600)).toBe('₹1,23,456');
    expect(formatPaise(99_950)).toBe('₹999.5');
  });
  it('applies the free-shipping threshold', () => {
    expect(shippingForSubtotal(0)).toBe(0);
    expect(shippingForSubtotal(99_899)).toBe(7_900);
    expect(shippingForSubtotal(99_900)).toBe(0);
  });
  it('only reports genuine discounts', () => {
    expect(discountPercent(80_000, 100_000)).toBe(20);
    expect(discountPercent(80_000, 80_000)).toBeNull();
    expect(discountPercent(80_000, null)).toBeNull();
  });
});

describe('schemas', () => {
  it('normalises Indian mobile numbers', () => {
    expect(phoneSchema.parse('+91 98765-43210')).toBe('9876543210');
    expect(() => phoneSchema.parse('12345')).toThrow();
  });
  it('rejects unknown keys such as role on registration', () => {
    const r = registerSchema.safeParse({ name: 'Asha', email: 'A@B.CO', password: 'abcdefgh12', acceptTerms: true, role: 'admin' });
    expect(r.success).toBe(false);
  });
  it('lower-cases emails', () => {
    const r = registerSchema.parse({ name: 'Asha', email: ' Asha@Example.COM ', password: 'abcdefgh12', acceptTerms: true });
    expect(r.email).toBe('asha@example.com');
  });
  it('does not apply defaults on partial address updates', () => {
    expect(updateAddressSchema.parse({ city: 'Pune' })).toEqual({ city: 'Pune' });
    expect(addressSchema.parse({ fullName: 'A B', phone: '9876543210', addressLine1: '1 MG Rd', city: 'Pune', state: 'Maharashtra', postalCode: '411001' }).isDefault).toBe(false);
  });
  it('parses listing filters from query strings', () => {
    const q = productQuerySchema.parse({ finish: 'gold,silver', inStock: 'true', minPrice: '500' });
    expect(q).toMatchObject({ finish: ['gold', 'silver'], inStock: true, minPrice: 500, sort: 'new', page: 1 });
  });
  it('requires integer paise and a higher compare-at price', () => {
    const base = { name: 'Ring', sku: 'RNG-1', description: 'A lovely little ring for every day.', type: 'ring', finish: 'gold', pricePaise: 50_000, stock: 1 };
    expect(createProductSchema.safeParse(base).success).toBe(true);
    expect(createProductSchema.safeParse({ ...base, pricePaise: 500.5 }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, compareAtPricePaise: 40_000 }).success).toBe(false);
  });
  it('slugifies names', () => {
    expect(slugify('Noor Solitaire Ring & Band')).toBe('noor-solitaire-ring-and-band');
  });
});
