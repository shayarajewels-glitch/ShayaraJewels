'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api-client';

interface QueryState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Minimal client-side GET with reload and local updates (for authenticated, uncached pages). */
export function useApiQuery<T>(path: string | null) {
  const [state, setState] = useState<QueryState<T>>({ data: null, error: null, loading: path !== null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let active = true;
    api<T>(path).then(
      (data) => active && setState({ data, error: null, loading: false }),
      (err) => active && setState((s) => ({ ...s, error: errorMessage(err), loading: false })),
    );
    return () => {
      active = false;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((data: T) => setState({ data, error: null, loading: false }), []);
  return { ...state, reload, setData };
}
