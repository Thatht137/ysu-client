"use client";

import { CloudOff } from "lucide-react";
import { toast } from "sonner";
import { useRefreshStore } from "@/lib/refresh-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";

export function StaleIndicator({ className }: { className?: string }) {
  const stale = useRefreshStore((s) => s.stale);
  const { t } = useTranslation();

  if (stale === 0) return null;

  return (
    <button
      type="button"
      onClick={() => toast.info(t("app.staleDataTooltip"))}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      aria-label={t("app.staleDataTooltip")}
    >
      <CloudOff className="size-4" />
    </button>
  );
}
