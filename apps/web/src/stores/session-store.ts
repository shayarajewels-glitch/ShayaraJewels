'use client';

import { create } from 'zustand';
import type { SessionDto, UserDto } from '@shayara/shared';
import { api, onSessionPayload, setCsrfToken } from '@/lib/api-client';

interface SessionState {
  user: UserDto | null;
  status: 'idle' | 'loading' | 'ready';
  load: () => Promise<void>;
  setSession: (session: SessionDto) => void;
  setUser: (user: UserDto) => void;
  logout: () => Promise<void>;
}

/**
 * Client view of the server session. This is UI state only: every protected
 * action is authorized by the API from the HTTP-only session cookie.
 */
export const useSession = create<SessionState>((set, get) => ({
  user: null,
  status: 'idle',
  async load() {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    try {
      const session = await api<SessionDto>('/auth/me');
      setCsrfToken(session.csrfToken);
      set({ user: session.user, status: 'ready' });
    } catch {
      set({ user: null, status: 'ready' });
    }
  },
  setSession(session) {
    setCsrfToken(session.csrfToken);
    set({ user: session.user, status: 'ready' });
  },
  setUser(user) {
    set({ user });
  },
  async logout() {
    const session = await api<SessionDto>('/auth/logout', { method: 'POST' });
    get().setSession(session);
  },
}));

onSessionPayload((body) => {
  const b = body as Partial<SessionDto>;
  if (b && 'user' in b && b.csrfToken) useSession.setState({ user: b.user ?? null, status: 'ready' });
});
