"use client";

import { useMobileHeaderStore } from "@/lib/mobile-header-store";
import { RefreshIndicator } from "@/components/refresh-indicator";
import { StaleIndicator } from "@/components/stale-indicator";

interface Props {
  title: string;
}

export function MobileTopBar({ title }: Props) {
  const rightSlot = useMobileHeaderStore((s) => s.rightSlot);
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        <RefreshIndicator />
        <StaleIndicator />
      </div>
      <div className="flex items-center gap-1">{rightSlot}</div>
    </header>
  );
}
