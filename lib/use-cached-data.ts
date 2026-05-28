"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { cacheKey, cacheGetStale, cacheSet, dedupedFetch, DEFAULT_TTL_MS, LONG_TTL_MS } from "./cache";

export { DEFAULT_TTL_MS, LONG_TTL_MS };
import { useRefreshStore } from "./refresh-store";

export interface UseCachedDataOptions<T> {
  fetch: () => Promise<T>;
  /** 自定义 TTL（默认 24h） */
  ttl?: number;
  /** 请求失败时返回降级值，不设置 error 状态 */
  fallback?: (err: Error) => T | null;
}

export interface UseCachedDataResult<T> {
  data: T | null;
  /** 无缓存数据时的首次加载 */
  loading: boolean;
  /** 后台刷新进行中 */
  refreshing: boolean;
  /** 显示的是过期缓存，刷新失败 */
  stale: boolean;
  error: Error | null;
  /** 手动刷新 */
  refresh: () => void;
}

/** 防止短时间内对同一个 key 重复弹 toast */
const recentErrorKeys = new Set<string>();

function showErrorToast(key: string, message: string): void {
  if (recentErrorKeys.has(key)) return;
  recentErrorKeys.add(key);
  toast.error(message);
  setTimeout(() => recentErrorKeys.delete(key), 3000);
}

export function useCachedData<T>(
  keyParts: (string | null | undefined)[],
  opts: UseCachedDataOptions<T>,
): UseCachedDataResult<T> {
  const { ttl = DEFAULT_TTL_MS } = opts;

  const depsKey = keyParts.join("\0");
  const key = useMemo(() => {
    if (keyParts.some((p) => p == null)) return null;
    return cacheKey(keyParts as string[]);
  }, [depsKey]);

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 用 ref 持有回调，避免它们变化时触发 effect 重新执行
  const fetchRef = useRef(opts.fetch);
  const fallbackRef = useRef(opts.fallback);
  useEffect(() => {
    fetchRef.current = opts.fetch;
    fallbackRef.current = opts.fallback;
  });

  // 追踪本实例对全局 refresh / stale 计数器的贡献，避免错误清除其他源的标记
  const contributedRefresh = useRef(false);
  const contributedStale = useRef(false);

  function startRefresh() {
    if (contributedRefresh.current) return;
    contributedRefresh.current = true;
    useRefreshStore.getState().start();
    setRefreshing(true);
  }

  function endRefresh() {
    if (!contributedRefresh.current) return;
    contributedRefresh.current = false;
    setRefreshing(false);
    useRefreshStore.getState().end();
  }

  function markStale() {
    if (contributedStale.current) return;
    contributedStale.current = true;
    useRefreshStore.getState().markStale();
    setStale(true);
  }

  function markFresh() {
    if (!contributedStale.current) return;
    contributedStale.current = false;
    useRefreshStore.getState().markFresh();
    setStale(false);
  }

  // 初始加载 + key 变化时重新加载
  useEffect(() => {
    if (!key) {
      setData(null);
      setLoading(false);
      setStale(false);
      setError(null);
      // key 变为 null 时清理全局计数器贡献
      endRefresh();
      if (contributedStale.current) {
        useRefreshStore.getState().markFresh();
        contributedStale.current = false;
      }
      return;
    }

    const fetch = fetchRef.current;
    const fallback = fallbackRef.current;

    const cached = cacheGetStale<T>(key, ttl);
    let hasInitialData = false;

    if (cached) {
      setData(cached.data);
      setStale(cached.stale);
      setLoading(false);
      if (cached.stale) markStale();
      hasInitialData = true;
    } else {
      setData(null);
      setLoading(true);
      setStale(false);
    }

    let cancelled = false;
    const background = hasInitialData;

    if (background) startRefresh();

    (async () => {
      try {
        const result = await dedupedFetch(key, fetch);
        if (cancelled) return;
        setData(result);
        cacheSet(key, result);
        setError(null);
        markFresh();
      } catch (err) {
        if (cancelled) return;
        const e = err as Error;

        if (fallback) {
          const fb = fallback(e);
          if (fb !== null) {
            setData(fb);
            cacheSet(key, fb);
            markFresh();
          }
        } else {
          showErrorToast(key, e.message);
          if (!hasInitialData) setError(e);
          if (hasInitialData) markStale();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          endRefresh();
        }
      }
    })();

    return () => {
      cancelled = true;
      endRefresh();
      if (contributedStale.current) {
        contributedStale.current = false;
        useRefreshStore.getState().markFresh();
      }
    };
  }, [key, ttl]);

  const refresh = useCallback(() => {
    const k = key;
    if (!k) return;
    const fetch = fetchRef.current;
    startRefresh();
    (async () => {
      try {
        const result = await dedupedFetch(k, fetch);
        setData(result);
        cacheSet(k, result);
        setError(null);
        markFresh();
      } catch (err) {
        const e = err as Error;
        showErrorToast(k, e.message);
        markStale();
      } finally {
        endRefresh();
      }
    })();
  }, [key]);

  return { data, loading, refreshing, stale, error, refresh };
}
