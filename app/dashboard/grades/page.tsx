"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getGrades, getGPAStats, getCurrentWeek } from "@/lib/api";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";
import type { Grade, GPAStats } from "@/lib/types";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

export default function GradesPage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gpa, setGpa] = useState<GPAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const ALL_TERM = "__all__";
  const [term, setTerm] = useState(ALL_TERM);
  const [courseName, setCourseName] = useState("");
  const [showAllGpa, setShowAllGpa] = useState(false);

  const terms = Array.from(new Set(grades.map((g) => g.term).filter(Boolean))).sort();

  useEffect(() => {
    if (!credential) return;

    const cachedGrades = cacheGet<Grade[]>(cacheKey(["grades", credential]));
    const cachedGpa = cacheGet<GPAStats>(cacheKey(["gpa", credential]));
    if (cachedGrades) setGrades(cachedGrades);
    if (cachedGpa) setGpa(cachedGpa);
    if (cachedGrades || cachedGpa) {
      setLoading(false);
      toast.info(t("app.updating"));
    }

    async function load() {
      try {
        const [g, gp, weekInfo] = await Promise.all([
          getGrades(credential!),
          getGPAStats(credential!).catch(() => null),
          getCurrentWeek(credential!).catch(() => null),
        ]);
        setGrades(g);
        setGpa(gp);
        cacheSet(cacheKey(["grades", credential!]), g);
        cacheSet(cacheKey(["gpa", credential!]), gp);
        if (weekInfo?.term && terms.length === 0) {
          setTerm(weekInfo.term);
        }
      } catch (err) {
        if (!cachedGrades) toast.error((err as Error).message || t("app.updating"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [credential, t]);

  useEffect(() => {
    if (terms.length > 0 && term === ALL_TERM) {
      const latest = terms[terms.length - 1];
      if (latest) setTerm(latest);
    }
  }, [terms, term, ALL_TERM]);

  async function handleSearch() {
    if (!credential) return;
    setLoading(true);
    try {
      const g = await getGrades(credential, {
        term: term === ALL_TERM ? undefined : term,
        course_name: courseName || undefined,
      });
      setGrades(g);
    } catch (err) {
      toast.error((err as Error).message || t("app.updating"));
    } finally {
      setLoading(false);
    }
  }

  const filtered = grades.filter((g) => {
    if (term !== ALL_TERM && g.term !== term) return false;
    return true;
  });

  const basicGpaItems = [
    { label: t("grades.gpaInitial"), value: gpa?.gpa_initial },
    { label: t("dashboard.weightedAvg"), value: gpa?.weighted_avg },
    { label: t("dashboard.arithmeticAvg"), value: gpa?.arithmetic_avg },
  ];

  const extraGpaItems = [
    { label: t("grades.gpaHighest"), value: gpa?.gpa_highest },
    { label: t("grades.requiredGpaHighest"), value: gpa?.required_gpa_highest },
    { label: t("grades.degreeGpaInitial"), value: gpa?.degree_gpa_initial },
    { label: t("grades.degreeWeightedAvg"), value: gpa?.degree_weighted_avg },
  ];

  if (loading && grades.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-24" />
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("grades.gpaTitle")}</CardTitle>
              <CardDescription>{t("grades.gpaDescription")}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAllGpa((v) => !v)}>
              {showAllGpa ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {basicGpaItems.map((item) => (
              <div key={item.label} className="flex flex-col gap-1 rounded-md border p-3">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-lg font-semibold">{item.value || "-"}</span>
              </div>
            ))}
            {showAllGpa &&
              extraGpaItems.map((item) => (
                <div key={item.label} className="flex flex-col gap-1 rounded-md border p-3">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-lg font-semibold">{item.value || "-"}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("grades.title")}</CardTitle>
          <CardDescription>{t("grades.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("grades.termLabel")}</label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("grades.allTerms")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TERM}>{t("grades.allTerms")}</SelectItem>
                  {terms.map((tItem) => (
                    <SelectItem key={tItem} value={tItem!}>
                      {tItem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("grades.courseNameLabel")}</label>
              <Input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder={t("grades.courseNamePlaceholder")}
                className="w-48"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="size-4" />
              {t("grades.search")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("grades.table.term")}</TableHead>
                  <TableHead>{t("grades.table.courseName")}</TableHead>
                  <TableHead>{t("grades.table.courseCode")}</TableHead>
                  <TableHead>{t("grades.table.score")}</TableHead>
                  <TableHead>{t("grades.table.gradePoint")}</TableHead>
                  <TableHead>{t("grades.table.credit")}</TableHead>
                  <TableHead>{t("grades.table.type")}</TableHead>
                  <TableHead>{t("grades.table.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {t("grades.table.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{g.term}</TableCell>
                      <TableCell className="font-medium">{g.course_name}</TableCell>
                      <TableCell>{g.course_code}</TableCell>
                      <TableCell>{g.score}</TableCell>
                      <TableCell>{g.grade_point}</TableCell>
                      <TableCell>{g.credit}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{g.course_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {g.is_pass ? (
                          <Badge variant="default">{t("grades.table.pass")}</Badge>
                        ) : (
                          <Badge variant="destructive">{t("grades.table.fail")}</Badge>
                        )}
                      </TableCell>
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
