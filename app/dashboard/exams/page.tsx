"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { getExams } from "@/lib/api";
import type { Exam } from "@/lib/types";
import { MapPin, Clock, CalendarDays } from "lucide-react";

export default function ExamsPage() {
  const credential = useAuthStore((s) => s.credential);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const e = await getExams(credential!);
        setExams(e);
      } catch (err) {
        toast.error((err as Error).message || "加载失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [credential]);

  async function handleQuery() {
    if (!credential) return;
    setLoading(true);
    try {
      const e = await getExams(credential, term || undefined);
      setExams(e);
    } catch (err) {
      toast.error((err as Error).message || "查询失败");
    } finally {
      setLoading(false);
    }
  }

  if (loading && exams.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>考试安排</CardTitle>
          <CardDescription>查看各学期考试时间与地点</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">学期</label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="如 2024-2025-1" className="w-48" />
            </div>
            <Button onClick={handleQuery}>查询</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {exams.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">暂无考试安排</p>
        ) : (
          exams.map((exam, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base">{exam.name}</CardTitle>
                <CardDescription>{exam.exam_name}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span>{exam.exam_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>{exam.exam_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span>{exam.exam_location}</span>
                </div>
                {exam.seat_number && (
                  <Badge variant="outline">座位号: {exam.seat_number}</Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
