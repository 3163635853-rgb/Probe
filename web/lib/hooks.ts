import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAPI, getErrorMessage } from "./api";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * 通用数据加载 hook
 * @param fetcher - 返回 Promise 的函数，传 null 跳过请求
 * @param deps - 依赖数组，变化时重新请求
 */
export function useAsync<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[] = []
): AsyncState<T> & { refetch: () => void } {
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
        setState((s) => ({ ...s, loading: false, error: getErrorMessage(e, "加载失败") }));
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
 */
export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  return useAsync<T>(
    path ? () => fetchAPI<T>(path) : null,
    [path, ...deps]
  );
}
