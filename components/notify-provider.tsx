"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { startNotifyIfNeeded, stopNotify, syncServerConfigToNative } from "@/lib/notify";
import { isCapacitor } from "@/lib/platform";

/**
 * 启动成绩/考试通知轮询。
 * 在 SDK 初始化完成后挂载，仅 Capacitor 平台生效。
 */
export function NotifyProvider() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isCapacitor() || !isAuthenticated) return;
    syncServerConfigToNative().catch(() => {});
    startNotifyIfNeeded();
    return () => {
      stopNotify();
    };
  }, [isAuthenticated]);

  return null;
}
