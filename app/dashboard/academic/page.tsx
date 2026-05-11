"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/auth-store";
import { getAcademicCompletion, getAcademicWarnings } from "@/lib/api";
import type { AcademicCompletion, AcademicWarning } from "@/lib/types";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AcademicPage() {
  const credential = useAuthStore((s) => s.credential);
  const [completion, setCompletion] = useState<AcademicCompletion | null>(null);
  const [warnings, setWarnings] = useState<AcademicWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const [c, w] = await Promise.all([
          getAcademicCompletion(credential!).catch(() => null),
          getAcademicWarnings(credential!).catch(() => []),
        ]);
        setCompletion(c);
        setWarnings(w);
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
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>学业完成</CardTitle>
          <CardDescription>培养方案完成情况</CardDescription>
        </CardHeader>
        <CardContent>
          {completion ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1 rounded-lg border p-4">
                  <span className="text-sm text-muted-foreground">培养方案</span>
                  <span className="text-xl font-semibold">{completion.plan_name || "-"}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-4">
                  <span className="text-sm text-muted-foreground">要求学分</span>
                  <span className="text-xl font-semibold">{completion.total_required || "-"}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-4">
                  <span className="text-sm text-muted-foreground">已完成</span>
                  <span className="text-xl font-semibold">{completion.completed || "-"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {completion.passed ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="size-3" />
                    已通过
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" />
                    未完成
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">暂无学业完成数据</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>学业预警</CardTitle>
          <CardDescription>学业状态预警信息</CardDescription>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>无预警</AlertTitle>
              <AlertDescription>当前没有学业预警信息</AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>预警类型</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>学期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warnings.map((w, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{w.warning_type}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{w.warning_level}</Badge>
                      </TableCell>
                      <TableCell>{w.description}</TableCell>
                      <TableCell>{w.term}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
