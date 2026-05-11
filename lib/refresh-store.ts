"use client";

import { useEffect } from "react";
import { create } from "zustand";

interface RefreshState {
  count: number;
  start: () => void;
  end: () => void;
}

export const useRefreshStore = create<RefreshState>((set) => ({
  count: 0,
  start: () => set((s) => ({ count: s.count + 1 })),
  end: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));

export function useBackgroundRefresh(active: boolean) {
  const start = useRefreshStore((s) => s.start);
  const end = useRefreshStore((s) => s.end);
  useEffect(() => {
    if (!active) return;
    start();
    return () => end();
  }, [active, start, end]);
}
