'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ProductSummaryDto } from '@shayara/shared';

/**
 * Wishlist kept on this device. It stores a small product snapshot for display;
 * prices and availability are re-checked from the API when the wishlist page loads.
 */
interface WishlistState {
  items: ProductSummaryDto[];
  toggle: (product: ProductSummaryDto) => boolean;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  replace: (items: ProductSummaryDto[]) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle(product) {
        const exists = get().items.some((p) => p.id === product.id);
        set({ items: exists ? get().items.filter((p) => p.id !== product.id) : [product, ...get().items].slice(0, 100) });
        return !exists;
      },
      remove(id) {
        set({ items: get().items.filter((p) => p.id !== id) });
      },
      has(id) {
        return get().items.some((p) => p.id === id);
      },
      replace(items) {
        set({ items });
      },
    }),
    { name: 'shayara-wishlist', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
