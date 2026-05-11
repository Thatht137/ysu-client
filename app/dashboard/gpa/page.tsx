"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/auth-store";
import { getGPAStats } from "@/lib/api";
import type { GPAStats } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

export default function GPAPage() {
  const credential = useAuthStore((s) => s.credential);
  const [gpa, setGpa] = useState<GPAStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const g = await getGPAStats(credential!);
        setGpa(g);
      } catch (err) {
        toast.error((err as Error).message || "加载失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [credential]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const items = [
    { label: "培养方案", value: gpa?.plan_name },
    { label: "学习形式", value: gpa?.study_type },
    { label: "必修已得学分", value: gpa?.required_credit_earned },
    { label: "选修已得学分", value: gpa?.elective_credit_earned },
    { label: "学位课已得学分", value: gpa?.degree_credit_earned },
    { label: "必修未通过学分", value: gpa?.required_credit_failed },
    { label: "初始平均绩点", value: gpa?.gpa_initial },
    { label: "最高平均绩点", value: gpa?.gpa_highest },
    { label: "必修最高绩点", value: gpa?.required_gpa_highest },
    { label: "学位课初始绩点", value: gpa?.degree_gpa_initial },
    { label: "学位课最高绩点", value: gpa?.degree_gpa_highest },
    { label: "加权平均分", value: gpa?.weighted_avg },
    { label: "算术平均分", value: gpa?.arithmetic_avg },
    { label: "学位课加权平均分", value: gpa?.degree_weighted_avg },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>学分绩点统计</CardTitle>
          <CardDescription>学业成绩总览</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.label} className="flex flex-col gap-1 rounded-lg border p-4">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-2xl font-semibold">{item.value || "-"}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
