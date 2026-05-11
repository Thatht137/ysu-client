"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const tabs = [
    { href: "/dashboard", label: t("app.overview"), icon: LayoutDashboard },
    { href: "/dashboard/schedule", label: t("app.schedule"), icon: Calendar },
    { href: "/dashboard/grades", label: t("app.grades"), icon: GraduationCap },
    {
      href: "/dashboard/evaluation",
      label: t("app.evaluation"),
      icon: ClipboardCheck,
    },
    { href: "/dashboard/me", label: t("app.me"), icon: User },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
