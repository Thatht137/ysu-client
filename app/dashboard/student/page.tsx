"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getStudentInfo } from "@/lib/api";
import type { StudentInfo } from "@/lib/types";

export default function StudentPage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const s = await getStudentInfo(credential!);
        setStudent(s);
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
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const fields = [
    { label: t("student.fields.name"), value: student?.name },
    { label: t("student.fields.studentId"), value: student?.student_id },
    { label: t("student.fields.pinyin"), value: student?.name_pinyin },
    { label: t("student.fields.gender"), value: student?.gender },
    { label: t("student.fields.nation"), value: student?.nation },
    { label: t("student.fields.nationality"), value: student?.nationality },
    { label: t("student.fields.department"), value: student?.department },
    { label: t("student.fields.major"), value: student?.major },
    { label: t("student.fields.className"), value: student?.class_name },
    { label: t("student.fields.gradeLevel"), value: student?.grade_level },
    { label: t("student.fields.enrollmentDate"), value: student?.enrollment_date },
    { label: t("student.fields.expectedGraduation"), value: student?.expected_graduation },
    { label: t("student.fields.educationLevel"), value: student?.education_level },
    { label: t("student.fields.campus"), value: student?.campus },
    { label: t("student.fields.studentStatus"), value: student?.student_status },
    { label: t("student.fields.studyDuration"), value: student?.study_duration },
    { label: t("student.fields.foreignLanguage"), value: student?.foreign_language },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("student.title")}</CardTitle>
          <CardDescription>{t("student.description")}</CardDescription>
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
