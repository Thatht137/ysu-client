"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { getStudentInfo } from "@/lib/api";
import type { StudentInfo } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

export default function StudentPage() {
  const credential = useAuthStore((s) => s.credential);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const s = await getStudentInfo(credential!);
        setStudent(s);
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
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const fields = [
    { label: "姓名", value: student?.name },
    { label: "学号", value: student?.student_id },
    { label: "拼音", value: student?.name_pinyin },
    { label: "性别", value: student?.gender },
    { label: "民族", value: student?.nation },
    { label: "国籍", value: student?.nationality },
    { label: "院系", value: student?.department },
    { label: "专业", value: student?.major },
    { label: "班级", value: student?.class_name },
    { label: "年级", value: student?.grade_level },
    { label: "入学日期", value: student?.enrollment_date },
    { label: "预计毕业", value: student?.expected_graduation },
    { label: "学历层次", value: student?.education_level },
    { label: "校区", value: student?.campus },
    { label: "学籍状态", value: student?.student_status },
    { label: "学制", value: student?.study_duration },
    { label: "外语语种", value: student?.foreign_language },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>学生基本信息</CardTitle>
          <CardDescription>个人学籍与身份信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => (
              <div key={f.label} className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">{f.label}</span>
                <span className="font-medium">{f.value || "-"}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
