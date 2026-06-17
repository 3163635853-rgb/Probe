import { useState, useCallback } from "react";

/**
 * 下拉刷新 hook，配合 FlatList 的 RefreshControl 使用
 */
export function useRefresh(refetch: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return { refreshing, onRefresh };
}
