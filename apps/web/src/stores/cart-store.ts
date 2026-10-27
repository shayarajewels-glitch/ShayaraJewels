'use client';

import { create } from 'zustand';
import type { CartDto } from '@shayara/shared';
import { api } from '@/lib/api-client';

interface CartState {
  cart: CartDto | null;
  loading: boolean;
  drawerOpen: boolean;
  refresh: () => Promise<void>;
  add: (productId: string, quantity: number, size?: string) => Promise<void>;
  update: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  setCart: (cart: CartDto) => void;
  setDrawerOpen: (open: boolean) => void;
}

/** Mirrors the server cart. Prices and totals always come from the API. */
export const useCart = create<CartState>((set) => ({
  cart: null,
  loading: false,
  drawerOpen: false,
  async refresh() {
    set({ loading: true });
    try {
      set({ cart: await api<CartDto>('/cart') });
    } finally {
      set({ loading: false });
    }
  },
  async add(productId, quantity, size) {
    const cart = await api<CartDto>('/cart/items', { method: 'POST', body: { productId, quantity, size } });
    set({ cart });
  },
  async update(productId, quantity) {
    const cart = await api<CartDto>(`/cart/items/${productId}`, { method: 'PATCH', body: { quantity } });
    set({ cart });
  },
  async remove(productId) {
    const cart = await api<CartDto>(`/cart/items/${productId}`, { method: 'DELETE' });
    set({ cart });
  },
  setCart(cart) {
    set({ cart });
  },
  setDrawerOpen(open) {
    set({ drawerOpen: open });
  },
}));
