"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getStudentInfo, getCurrentWeek, getGPAStats, getExperimentalSchedule, getExams } from "@/lib/api";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";
import type { StudentInfo, CurrentWeek, GPAStats, Course, Exam } from "@/lib/types";
import { Calendar, GraduationCap, BarChart3, Clock, BookOpen } from "lucide-react";

function parseWeeks(weeksStr: string): number[] {
  const result = new Set<number>();
  if (!weeksStr) return [];
  const cleaned = weeksStr.replace(/[周第\s]/g, "");
  const parts = cleaned.split(/[,，]/);
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((s) => parseInt(s, 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let w = start; w <= end; w++) result.add(w);
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n)) result.add(n);
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}

function isCourseActiveToday(course: Course, currentWeek: number, currentWeekday: number): boolean {
  if (course.week_day !== currentWeekday) return false;
  const weeks = parseWeeks(course.weeks || "");
  if (weeks.length === 0) return true;
  return weeks.includes(currentWeek);
}

export default function DashboardPage() {
  const router = useRouter();
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  const [gpa, setGpa] = useState<GPAStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credential) return;

    const cachedStudent = cacheGet<StudentInfo>(cacheKey(["student", credential]));
    const cachedWeek = cacheGet<CurrentWeek>(cacheKey(["week", credential]));
    const cachedGpa = cacheGet<GPAStats>(cacheKey(["gpa", credential]));
    const cachedCourses = cacheGet<Course[]>(cacheKey(["schedule", credential]));
    const cachedExams = cacheGet<Exam[]>(cacheKey(["exams", credential]));

    if (cachedStudent) setStudent(cachedStudent);
    if (cachedWeek) setCurrentWeek(cachedWeek);
    if (cachedGpa) setGpa(cachedGpa);
    if (cachedCourses) setCourses(cachedCourses);
    if (cachedExams) setExams(cachedExams);

    if (cachedStudent || cachedWeek || cachedGpa || cachedCourses || cachedExams) {
      setLoading(false);
      toast.info(t("app.updating"));
    }

    async function load() {
      try {
        const [s, w, g, c, e] = await Promise.all([
          getStudentInfo(credential!),
          getCurrentWeek(credential!).catch(() => null),
          getGPAStats(credential!).catch(() => null),
          getExperimentalSchedule(credential!, undefined, "all").catch(() => []),
          getExams(credential!).catch(() => []),
        ]);
        setStudent(s);
        setCurrentWeek(w);
        setGpa(g);
        setCourses(c);
        setExams(e);
        cacheSet(cacheKey(["student", credential!]), s);
        cacheSet(cacheKey(["week", credential!]), w);
        cacheSet(cacheKey(["gpa", credential!]), g);
        cacheSet(cacheKey(["schedule", credential!]), c);
        cacheSet(cacheKey(["exams", credential!]), e);
      } catch (err) {
        if (!cachedStudent) toast.error((err as Error).message || t("app.updating"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [credential, t]);

  const todayCourses = useMemo(() => {
    if (!currentWeek) return [];
    return courses
      .filter((c) => isCourseActiveToday(c, currentWeek.week, currentWeek.weekday))
      .sort((a, b) => a.start_section - b.start_section);
  }, [courses, currentWeek]);

  const upcomingExams = useMemo(() => {
    const now = new Date();
    return exams
      .filter((e) => {
        if (!e.exam_date) return false;
        const d = new Date(e.exam_date.replace(/-/g, "/"));
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      })
      .sort((a, b) => {
        const da = new Date((a.exam_date || "").replace(/-/g, "/")).getTime();
        const db = new Date((b.exam_date || "").replace(/-/g, "/")).getTime();
        return da - db;
      })
      .slice(0, 3);
  }, [exams]);

  function getCurrentCourse(): Course | null {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeVal = hour * 60 + minute;
    const sectionMap: Record<number, [number, number]> = {
      1: [480, 575], 2: [480, 575],
      3: [600, 695], 4: [600, 695],
      5: [840, 935], 6: [840, 935],
      7: [960, 1055], 8: [960, 1055],
      9: [1140, 1235], 10: [1140, 1235],
    };
    for (const c of todayCourses) {
      for (let s = c.start_section; s <= c.end_section; s++) {
        const range = sectionMap[s];
        if (range && timeVal >= range[0] && timeVal <= range[1]) {
          return c;
        }
      }
    }
    return null;
  }

  const currentCourse = getCurrentCourse();
  const [showGPA, setShowGPA] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <GraduationCap className="size-6 text-primary shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{student?.name || "-"}</CardTitle>
              <CardDescription className="truncate">{student?.student_id || ""}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground truncate">
            {student?.department} · {student?.major}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Calendar className="size-6 text-primary shrink-0" />
            <div>
              <CardTitle className="text-base">{t("dashboard.currentWeek", { week: currentWeek?.week || "-" })}</CardTitle>
              <CardDescription>{currentWeek?.weekday ? t(`dashboard.weekdayNames.${currentWeek.weekday}`) : "-"}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {currentWeek?.term || ""}
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" onClick={() => setShowGPA((v) => !v)}>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <BarChart3 className="size-6 text-primary shrink-0" />
            <div>
              <CardTitle className="text-base">
                {showGPA ? gpa?.gpa_initial || "-" : "***"}
              </CardTitle>
              <CardDescription>{t("dashboard.gpaInitial")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {showGPA
              ? `${t("dashboard.weightedAvg")} ${gpa?.weighted_avg || "-"} · ${t("dashboard.arithmeticAvg")} ${gpa?.arithmetic_avg || "-"}`
              : t("dashboard.gpaInitial")
            }
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" onClick={() => router.push("/dashboard/evaluation")}>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Clock className="size-6 text-primary shrink-0" />
            <div>
              <CardTitle className="text-base">{t("app.evaluation")}</CardTitle>
              <CardDescription>{t("evaluation.title")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("evaluation.description")}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <CardTitle className="text-base">{t("dashboard.todayCourses")}</CardTitle>
          </div>
          {currentCourse && (
            <Badge variant="default" className="gap-1">
              <Clock className="size-3" />
              {t("dashboard.currentCourse")}: {currentCourse.name}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {todayCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noCoursesToday")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {todayCourses.map((c, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    currentCourse?.name === c.name && currentCourse?.start_section === c.start_section
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.teacher} · {c.classroom}
                    </span>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {t("dashboard.sectionRange", { start: c.start_section, end: c.end_section })}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            <CardTitle className="text-base">{t("dashboard.upcomingExams")}</CardTitle>
          </div>
          <Badge variant="secondary">{t("dashboard.examCount", { count: upcomingExams.length })}</Badge>
        </CardHeader>
        <CardContent>
          {upcomingExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noExams")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingExams.map((exam, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{exam.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {exam.exam_date} {exam.exam_time} · {exam.exam_location}
                    </span>
                  </div>
                  {exam.seat_number && (
                    <Badge variant="outline" className="shrink-0">{t("dashboard.seatNumber", { num: exam.seat_number })}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
