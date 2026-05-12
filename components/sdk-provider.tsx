"use client";

import { useEffect } from "react";
import { initSDK } from "@/lib/sdk";
import { checkAuthStatus } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export function SDKProvider({ children }: { children: React.ReactNode }) {
  const clearCredential = useAuthStore((s) => s.clearCredential);

  useEffect(() => {
    initSDK()
      .then(() =>
        checkAuthStatus().then((status) => {
          if (!status.authenticated) {
            clearCredential();
          }
        }),
      )
      .catch(() => {
        clearCredential();
      });
  }, [clearCredential]);

  return children;
}
