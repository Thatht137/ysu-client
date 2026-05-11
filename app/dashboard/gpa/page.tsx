"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getGPAStats } from "@/lib/api";
import type { GPAStats } from "@/lib/types";

export default function GPAPage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
  const [gpa, setGpa] = useState<GPAStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const g = await getGPAStats(credential!);
        setGpa(g);
      } catch (err) {
        toast.error((err as Error).message || t("app.updating"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [credential, t]);

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
    { label: t("gpa.planName"), value: gpa?.plan_name },
    { label: t("gpa.studyType"), value: gpa?.study_type },
    { label: t("gpa.requiredEarned"), value: gpa?.required_credit_earned },
    { label: t("gpa.electiveEarned"), value: gpa?.elective_credit_earned },
    { label: t("gpa.degreeEarned"), value: gpa?.degree_credit_earned },
    { label: t("gpa.requiredFailed"), value: gpa?.required_credit_failed },
    { label: t("grades.gpaInitial"), value: gpa?.gpa_initial },
    { label: t("grades.gpaHighest"), value: gpa?.gpa_highest },
    { label: t("grades.requiredGpaHighest"), value: gpa?.required_gpa_highest },
    { label: t("grades.degreeGpaInitial"), value: gpa?.degree_gpa_initial },
    { label: t("gpa.degreeGpaHighest"), value: gpa?.degree_gpa_highest },
    { label: t("dashboard.weightedAvg"), value: gpa?.weighted_avg },
    { label: t("dashboard.arithmeticAvg"), value: gpa?.arithmetic_avg },
    { label: t("grades.degreeWeightedAvg"), value: gpa?.degree_weighted_avg },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("gpa.title")}</CardTitle>
          <CardDescription>{t("gpa.description")}</CardDescription>
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
