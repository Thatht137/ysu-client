"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { getStudentInfo, getCurrentWeek, getGPAStats } from "@/lib/api";
import type { StudentInfo, CurrentWeek, GPAStats } from "@/lib/types";
import { Calendar, GraduationCap, BarChart3, Clock } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const credential = useAuthStore((s) => s.credential);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  const [gpa, setGpa] = useState<GPAStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const [s, w, g] = await Promise.all([
          getStudentInfo(credential!),
          getCurrentWeek(credential!).catch(() => null),
          getGPAStats(credential!).catch(() => null),
        ]);
        setStudent(s);
        setCurrentWeek(w);
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <GraduationCap className="size-8 text-primary" />
            <div>
              <CardTitle>{student?.name || "未知"}</CardTitle>
              <CardDescription>{student?.student_id || ""}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1 text-sm">
              <span>{student?.department}</span>
              <span>{student?.major}</span>
              <span>{student?.class_name}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Calendar className="size-8 text-primary" />
            <div>
              <CardTitle>当前周次</CardTitle>
              <CardDescription>{currentWeek?.term || ""}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">第 {currentWeek?.week || "-"} 周</span>
            </div>
            <p className="text-sm text-muted-foreground">星期 {currentWeek?.weekday || "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <BarChart3 className="size-8 text-primary" />
            <div>
              <CardTitle>平均绩点</CardTitle>
              <CardDescription>学分绩点统计</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{gpa?.gpa_initial || "-"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              加权平均: {gpa?.weighted_avg || "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer" onClick={() => router.push("/dashboard/grades")}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <GraduationCap className="size-8 text-primary" />
            <div>
              <CardTitle>成绩查询</CardTitle>
              <CardDescription>查看全部成绩</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">点击查询各学期成绩与绩点详情</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer" onClick={() => router.push("/dashboard/schedule")}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Calendar className="size-8 text-primary" />
            <div>
              <CardTitle>课表查询</CardTitle>
              <CardDescription>查看课程安排</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">点击查询理论课表与实验选课</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer" onClick={() => router.push("/dashboard/evaluation")}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Clock className="size-8 text-primary" />
            <div>
              <CardTitle>学生评教</CardTitle>
              <CardDescription>期末教学评价</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">点击进行课程评价</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
