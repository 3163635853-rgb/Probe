import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAPI } from "./api";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetch<T>(
  path: string | null,
  _legacyDeps: unknown[] = []
): AsyncState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: path !== null,
    error: null,
  });
  const mountedRef = useRef(true);
  const requestId = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!path) {
      setState((current) => current.loading ? { ...current, loading: false } : current);
      return;
    }

    const currentRequest = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await fetchAPI<T>(path);
      if (mountedRef.current && currentRequest === requestId.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (error: unknown) {
      if (mountedRef.current && currentRequest === requestId.current) {
        const message = error instanceof Error ? error.message : "加载失败";
        setState((current) => ({ ...current, loading: false, error: message }));
      }
    }
  }, [path]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return { ...state, refetch: load };
}
