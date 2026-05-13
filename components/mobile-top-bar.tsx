"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMobileHeaderStore } from "@/lib/mobile-header-store";
import { RefreshIndicator } from "@/components/refresh-indicator";
import { StaleIndicator } from "@/components/stale-indicator";

interface Props {
  title: string;
  showBack?: boolean;
}

export function MobileTopBar({ title, showBack }: Props) {
  const router = useRouter();
  const rightSlot = useMobileHeaderStore((s) => s.rightSlot);

  return (
    <header className="fixed top-0 z-30 flex h-12 w-full items-center justify-between gap-3 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 -ml-1 flex size-8 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="truncate text-base font-semibold">{title}</h1>
        <RefreshIndicator />
        <StaleIndicator />
      </div>
      <div className="flex items-center gap-1">{rightSlot}</div>
    </header>
  );
}
