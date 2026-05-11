"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Locale } from "@/lib/i18n/dict";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  ScrollText,
  Sun,
  User,
  BarChart3,
  Globe,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, hasHydrated, username, clearCredential } = useAuthStore();
  const { t, locale, setLocale } = useTranslation();

  const navItems = [
    { title: t("app.overview"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("app.studentInfo"), url: "/dashboard/student", icon: User },
    { title: t("app.grades"), url: "/dashboard/grades", icon: GraduationCap },
    { title: t("app.gpa"), url: "/dashboard/gpa", icon: BarChart3 },
    { title: t("app.schedule"), url: "/dashboard/schedule", icon: Calendar },
    { title: t("app.exams"), url: "/dashboard/exams", icon: FileText },
    { title: t("app.trainingPlan"), url: "/dashboard/training-plan", icon: BookOpen },
    { title: t("app.academic"), url: "/dashboard/academic", icon: ScrollText },
    { title: t("app.evaluation"), url: "/dashboard/evaluation", icon: ClipboardCheck },
  ];

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  function handleLogout() {
    clearCredential();
    toast.success(t("app.logout"));
    router.replace("/login");
  }

  function toggleLocale() {
    setLocale(locale === "zh" ? "en" : "zh");
  }

  if (!hasHydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">{t("app.updating")}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-3">
            <GraduationCap className="size-6 shrink-0" />
            <span className="font-semibold group-data-[collapsible=icon]:hidden">{t("app.name")}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("app.nav")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleLocale}
                tooltip={t("app.language")}
              >
                <Globe className="size-4" />
                <span>{locale === "zh" ? "中文" : "English"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                tooltip={t("app.theme")}
              >
                <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span>{t("app.theme")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">
              {navItems.find((i) => i.url === pathname)?.title || t("app.name")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleLocale}>
              <Globe className="size-4 mr-1" />
              {locale === "zh" ? "中文" : "EN"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-8 rounded-full">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {username?.slice(-2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-muted-foreground">
                  {username || t("app.login")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 size-4" />
                  {t("app.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </SidebarProvider>
  );
}
