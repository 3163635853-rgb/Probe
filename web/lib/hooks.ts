import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "./api";

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

  const load = useCallback(async () => {
    if (!fetcher) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message || "加载失败" }));
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
