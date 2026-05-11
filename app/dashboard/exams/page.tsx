"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getExams } from "@/lib/api";
import type { Exam } from "@/lib/types";
import { MapPin, Clock, CalendarDays } from "lucide-react";

export default function ExamsPage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
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
        toast.error((err as Error).message || t("app.updating"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [credential, t]);

  async function handleQuery() {
    if (!credential) return;
    setLoading(true);
    try {
      const e = await getExams(credential, term || undefined);
      setExams(e);
    } catch (err) {
      toast.error((err as Error).message || t("app.updating"));
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
          <CardTitle>{t("exams.title")}</CardTitle>
          <CardDescription>{t("exams.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("exams.termLabel")}</label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t("exams.termPlaceholder")} className="w-48" />
            </div>
            <Button onClick={handleQuery}>{t("exams.query")}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {exams.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">{t("exams.noData")}</p>
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
                  <Badge variant="outline">{t("exams.seatNumber")}: {exam.seat_number}</Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
