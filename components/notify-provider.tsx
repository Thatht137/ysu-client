"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/lib/settings-store";
import { useAuthStore } from "@/lib/auth-store";
import { startNotifyIfNeeded, stopNotify, syncCastgcToNative, syncServerConfigToNative } from "@/lib/notify";
import { isCapacitor } from "@/lib/platform";

/**
 * 启动成绩/考试通知轮询。
 * 在 SDK 初始化完成后挂载，仅 Capacitor 平台生效。
 */
export function NotifyProvider() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const didStart = useRef(false);

  useEffect(() => {
    if (!isCapacitor() || !isAuthenticated || didStart.current) return;
    didStart.current = true;
    // Always sync CASTGC to native plugin on auth, regardless of notify settings
    syncCastgcToNative().catch(() => {});
    syncServerConfigToNative().catch(() => {});
    startNotifyIfNeeded();
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      stopNotify();
    };
  }, []);

  return null;
}
