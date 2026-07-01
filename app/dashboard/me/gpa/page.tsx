"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useGPAStats } from "@/providers/hooks";

export default function GPAPage() {
  const { t } = useTranslation();
  const { data: gpa, isLoading } = useGPAStats();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const items = [
    { label: t("gpa.planName"), value: gpa?.planName },
    { label: t("gpa.studyType"), value: gpa?.studyType },
    { label: t("gpa.requiredEarned"), value: gpa?.requiredCreditEarned },
    { label: t("gpa.electiveEarned"), value: gpa?.electiveCreditEarned },
    { label: t("gpa.degreeEarned"), value: gpa?.degreeCreditEarned },
    { label: t("gpa.requiredFailed"), value: gpa?.requiredCreditFailed },
    { label: t("grades.gpaInitial"), value: gpa?.gpaInitial },
    { label: t("grades.gpaHighest"), value: gpa?.gpaHighest },
    { label: t("grades.requiredGpaHighest"), value: gpa?.requiredGpaHighest },
    { label: t("grades.degreeGpaInitial"), value: gpa?.degreeGpaInitial },
    { label: t("gpa.degreeGpaHighest"), value: gpa?.degreeGpaHighest },
    { label: t("dashboard.weightedAvg"), value: gpa?.weightedAvg },
    { label: t("dashboard.arithmeticAvg"), value: gpa?.arithmeticAvg },
    { label: t("grades.degreeWeightedAvg"), value: gpa?.degreeWeightedAvg },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("gpa.title")}</CardTitle>
          <CardDescription>{t("gpa.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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
