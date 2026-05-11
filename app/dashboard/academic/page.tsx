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
import { useTranslation } from "@/lib/i18n/use-translation";
import { getAcademicCompletion, getAcademicWarnings } from "@/lib/api";
import type { AcademicCompletion, AcademicWarning } from "@/lib/types";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AcademicPage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
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
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("academic.completionTitle")}</CardTitle>
          <CardDescription>{t("academic.completionDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {completion ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1 rounded-lg border p-4">
                  <span className="text-sm text-muted-foreground">{t("academic.planName")}</span>
                  <span className="text-xl font-semibold">{completion.plan_name || "-"}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-4">
                  <span className="text-sm text-muted-foreground">{t("academic.totalRequired")}</span>
                  <span className="text-xl font-semibold">{completion.total_required || "-"}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-4">
                  <span className="text-sm text-muted-foreground">{t("academic.completed")}</span>
                  <span className="text-xl font-semibold">{completion.completed || "-"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {completion.passed ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="size-3" />
                    {t("academic.passed")}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" />
                    {t("academic.notPassed")}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t("academic.noCompletionData")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("academic.warningsTitle")}</CardTitle>
          <CardDescription>{t("academic.warningsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>{t("academic.noWarnings")}</AlertTitle>
              <AlertDescription>{t("academic.noWarningsDesc")}</AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("academic.table.type")}</TableHead>
                    <TableHead>{t("academic.table.level")}</TableHead>
                    <TableHead>{t("academic.table.description")}</TableHead>
                    <TableHead>{t("academic.table.term")}</TableHead>
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
