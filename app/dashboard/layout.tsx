"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  User,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

const navItems = [
  { title: "总览", url: "/dashboard", icon: LayoutDashboard },
  { title: "学生信息", url: "/dashboard/student", icon: User },
  { title: "成绩查询", url: "/dashboard/grades", icon: GraduationCap },
  { title: "绩点统计", url: "/dashboard/gpa", icon: BarChart3 },
  { title: "课表查询", url: "/dashboard/schedule", icon: Calendar },
  { title: "考试安排", url: "/dashboard/exams", icon: FileText },
  { title: "培养方案", url: "/dashboard/training-plan", icon: BookOpen },
  { title: "学业完成", url: "/dashboard/academic", icon: ScrollText },
  { title: "学生评教", url: "/dashboard/evaluation", icon: ClipboardCheck },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated, clearCredential } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  function handleLogout() {
    clearCredential();
    toast.success("已退出登录");
    router.replace("/login");
  }

  if (!hasHydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-3">
            <GraduationCap className="size-6" />
            <span className="font-semibold">YSU 教务</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>导航</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
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
          <div className="flex flex-col gap-2 p-2">
            <Separator />
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              退出登录
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 overflow-auto">
        <div className="flex items-center gap-2 border-b p-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">
            {navItems.find((i) => i.url === pathname)?.title || "YSU 教务"}
          </h1>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
