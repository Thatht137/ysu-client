"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/auth-store";
import { getTrainingPlan } from "@/lib/api";
import type { TrainingPlan } from "@/lib/types";

export default function TrainingPlanPage() {
  const credential = useAuthStore((s) => s.credential);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const p = await getTrainingPlan(credential!);
        setPlans(p);
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
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>培养方案</CardTitle>
          <CardDescription>个人培养方案课程列表</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>课程名</TableHead>
                  <TableHead>课程号</TableHead>
                  <TableHead>学分</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>是否必修</TableHead>
                  <TableHead>学期</TableHead>
                  <TableHead>课组</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      暂无培养方案数据
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{p.course_name}</TableCell>
                      <TableCell>{p.course_code}</TableCell>
                      <TableCell>{p.credit}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.course_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {p.required ? (
                          <Badge variant="default">必修</Badge>
                        ) : (
                          <Badge variant="outline">选修</Badge>
                        )}
                      </TableCell>
                      <TableCell>{p.term}</TableCell>
                      <TableCell>{p.course_group}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
