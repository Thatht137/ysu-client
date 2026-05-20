"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { isCapacitor } from "@/lib/platform";

/** Primary routes shown in the bottom navigation bar. */
const PRIMARY_ROUTES = [
  "/dashboard",
  "/dashboard/schedule",
  "/dashboard/grades",
  "/dashboard/evaluation",
  "/dashboard/me",
];

/** Routes that belong to the "Me" tab on mobile; back button returns to /dashboard/me. */
const ME_SUB_ROUTES = ["/dashboard/exams", "/dashboard/training-plan"];

function normalizePath(path: string): string {
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
}

export function BackButtonHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isCapacitor()) return;

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    App.addListener("backButton", () => {
      const currentPath = normalizePath(pathnameRef.current);

      if (currentPath === "/login") {
        App.exitApp();
        return;
      }

      if (PRIMARY_ROUTES.includes(currentPath)) {
        App.exitApp();
        return;
      }

      // Sub-routes of "Me" tab that have sidebar entries on tablet.
      // On both phone and tablet, back returns to /dashboard/me.
      if (ME_SUB_ROUTES.includes(currentPath)) {
        router.replace("/dashboard/me");
        return;
      }

      // Sort by length descending so longer prefixes match first.
      const sorted = [...PRIMARY_ROUTES].sort((a, b) => b.length - a.length);
      for (const primary of sorted) {
        if (currentPath.startsWith(primary + "/")) {
          router.replace(primary);
          return;
        }
      }

      router.replace("/dashboard");
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [router]);

  return null;
}
