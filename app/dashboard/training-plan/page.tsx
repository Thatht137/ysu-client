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
import { useTranslation } from "@/lib/i18n/use-translation";
import { getTrainingPlan } from "@/lib/api";
import type { TrainingPlan } from "@/lib/types";

export default function TrainingPlanPage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const p = await getTrainingPlan(credential!);
        setPlans(p);
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
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("trainingPlan.title")}</CardTitle>
          <CardDescription>{t("trainingPlan.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("trainingPlan.table.courseName")}</TableHead>
                  <TableHead>{t("trainingPlan.table.courseCode")}</TableHead>
                  <TableHead>{t("trainingPlan.table.credit")}</TableHead>
                  <TableHead>{t("trainingPlan.table.type")}</TableHead>
                  <TableHead>{t("trainingPlan.table.required")}</TableHead>
                  <TableHead>{t("trainingPlan.table.term")}</TableHead>
                  <TableHead>{t("trainingPlan.table.group")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t("trainingPlan.table.noData")}
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
                          <Badge variant="default">{t("trainingPlan.table.requiredYes")}</Badge>
                        ) : (
                          <Badge variant="outline">{t("trainingPlan.table.requiredNo")}</Badge>
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
