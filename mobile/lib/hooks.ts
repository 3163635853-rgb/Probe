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
  const requestId = useRef(0); // 防止旧请求覆盖新结果

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!fetcher) {
      setState((s) => (s.loading ? { ...s, loading: false } : s));
      return;
    }
    const thisRequest = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      // 只有最新的请求才更新 state
      if (mountedRef.current && thisRequest === requestId.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (e: unknown) {
      if (mountedRef.current && thisRequest === requestId.current) {
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

/**
 * 快捷 GET 请求 hook
 * 注意: deps 中的每个元素必须是 primitive（string/number/boolean/null），
 * 不要传 object/array，否则会触发无限重请求。
 */
export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  return useAsync<T>(
    path ? () => fetchAPI<T>(path) : null,
    [path, ...deps]
  );
}
