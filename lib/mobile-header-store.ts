"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { create } from "zustand";

interface MobileHeaderState {
  rightSlot: ReactNode;
  setRightSlot: (node: ReactNode) => void;
}

export const useMobileHeaderStore = create<MobileHeaderState>((set) => ({
  rightSlot: null,
  setRightSlot: (node) => set({ rightSlot: node }),
}));

export function useMobileHeaderRight(node: ReactNode, deps: unknown[] = []) {
  const setRightSlot = useMobileHeaderStore((s) => s.setRightSlot);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRightSlot(node);
    return () => setRightSlot(null);
  }, deps);
}
