import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAPI } from "./api";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[] = []
): AsyncState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: !!fetcher,
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!fetcher) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (mountedRef.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        const msg = e instanceof Error ? e.message : "加载失败";
        setState((s) => ({ ...s, loading: false, error: msg }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}

export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  return useAsync<T>(
    path ? () => fetchAPI<T>(path) : null,
    [path, ...deps]
  );
}
