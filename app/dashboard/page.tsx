"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/auth-store";
import { useSettingsStore } from "@/lib/settings-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getStudentInfo, getCurrentWeek, getGPAStats, getExperimentalSchedule, getExams, getClassPeriods } from "@/lib/api";
import { useCachedData, LONG_TTL_MS } from "@/lib/use-cached-data";
import { cn } from "@/lib/utils";
import { isCourseActiveInWeek, buildSectionTimeMap, isCoursePast } from "@/app/dashboard/schedule/schedule-utils";
import { syncScheduleToWidget, syncExamsToWidget } from "@/lib/widget-bridge";
import { syncClassAlarmsToNative } from "@/lib/notify";
import type { StudentInfo, CurrentWeek, GPAStats, Course, Exam, ClassPeriod } from "@/lib/types";
import { Calendar, GraduationCap, BarChart3, Clock, BookOpen, Eye, EyeOff } from "lucide-react";

function isCourseActiveToday(course: Course, currentWeek: number, currentWeekday: number): boolean {
  if (course.week_day !== currentWeekday) return false;
  return isCourseActiveInWeek(course, currentWeek);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 800): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    }
  }
  throw lastErr;
}

function getExamEndTime(exam: Exam): Date | null {
  if (!exam.exam_date) return null;
  const base = new Date(exam.exam_date.replace(/-/g, "/"));
  if (Number.isNaN(base.getTime())) return null;

  if (exam.exam_time) {
    const times = exam.exam_time.match(/\d{1,2}:\d{2}/g);
    if (times && times.length >= 2) {
      const [h, m] = times[times.length - 1].split(":").map(Number);
      base.setHours(h, m, 0, 0);
      return base;
    } else if (times && times.length === 1) {
      const [h, m] = times[0].split(":").map(Number);
      base.setHours(h, m, 0, 0);
      return base;
    }
  }
  base.setHours(23, 59, 59, 999);
  return base;
}

export default function DashboardPage() {
  const router = useRouter();
  const credential = useAuthStore((s) => s.credential);
  const avatarImage = useSettingsStore((s) => s.avatarImage);
  const { t } = useTranslation();
  const [showGPA, setShowGPA] = useState(false);

  const student = useCachedData(["student", credential], {
    fetch: () => withRetry(() => getStudentInfo()),
    ttl: LONG_TTL_MS,
  });

  const currentWeek = useCachedData(["week", credential], {
    fetch: () => withRetry(() => getCurrentWeek(credential!)),
    fallback: () => null,
  });

  const gpa = useCachedData(["gpa", credential], {
    fetch: () => withRetry(() => getGPAStats(credential!)),
    fallback: () => null,
  });

  const courses = useCachedData(["schedule", credential], {
    fetch: () => withRetry(() => getExperimentalSchedule(credential!, undefined, "all")),
    fallback: () => null,
  });

  const exams = useCachedData(["exams", credential], {
    fetch: () => withRetry(() => getExams(credential!)),
    fallback: () => null,
  });

  const periodsRaw = useCachedData(["periods", credential], {
    fetch: () => withRetry(() => getClassPeriods()),
    fallback: () => null,
  });

  const periods = useMemo(() => {
    if (!periodsRaw.data) return [];
    return periodsRaw.data.filter((x) => x.is_in_use).sort((a, b) => a.section - b.section);
  }, [periodsRaw.data]);

  const widgetSyncReminderHours = useSettingsStore((s) => s.widgetSyncReminderHours);
  const widgetShowNextDaySchedule = useSettingsStore((s) => s.widgetShowNextDaySchedule);

  // Sync courses to widget when fresh data arrives
  const activeCoursesForWidget = useMemo(() => {
    if (!currentWeek.data || !courses.data) return null;
    return courses.data.filter((c) => isCourseActiveInWeek(c, currentWeek.data!.week));
  }, [courses.data, currentWeek.data]);

  useEffect(() => {
    if (activeCoursesForWidget) {
      syncScheduleToWidget(activeCoursesForWidget, currentWeek.data, periods, widgetSyncReminderHours, widgetShowNextDaySchedule).catch(() => {});
      syncClassAlarmsToNative(activeCoursesForWidget, currentWeek.data, periods).catch(() => {});
    }
  }, [activeCoursesForWidget, currentWeek.data, periods, widgetSyncReminderHours, widgetShowNextDaySchedule]);

  // Sync exams to widget when fresh data arrives
  useEffect(() => {
    if (exams.data && exams.data.length > 0) {
      syncExamsToWidget(exams.data, widgetSyncReminderHours).catch(() => {});
    }
  }, [exams.data, widgetSyncReminderHours]);

  const hooks = [student, currentWeek, gpa, courses, exams, periodsRaw];
  const anyLoading = hooks.some((h) => h.loading);
  const hasAnyData = hooks.some((h) => h.data != null);

  const todayCourses = useMemo(() => {
    if (!currentWeek.data) return [];
    return (courses.data ?? [])
      .filter((c) => isCourseActiveToday(c, currentWeek.data!.week, currentWeek.data!.weekday))
      .sort((a, b) => a.start_section - b.start_section);
  }, [courses.data, currentWeek.data]);

  const upcomingExams = useMemo(() => {
    const now = new Date();
    return (exams.data ?? [])
      .filter((e) => {
        const end = getExamEndTime(e);
        if (!end) return false;
        return end >= now;
      })
      .sort((a, b) => {
        const da = new Date((a.exam_date || "").replace(/-/g, "/")).getTime();
        const db = new Date((b.exam_date || "").replace(/-/g, "/")).getTime();
        if (da !== db) return da - db;
        const ta = a.exam_time?.match(/\d{1,2}:\d{2}/g);
        const tb = b.exam_time?.match(/\d{1,2}:\d{2}/g);
        const ha = ta ? parseInt(ta[0], 10) : 0;
        const hb = tb ? parseInt(tb[0], 10) : 0;
        return ha - hb;
      })
      .slice(0, 3);
  }, [exams.data]);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const timeMap = useMemo(() => buildSectionTimeMap(periods), [periods]);

  const currentCourse = useMemo(() => {
    if (Object.keys(timeMap).length === 0) return null;
    for (const c of todayCourses) {
      for (let s = c.start_section; s <= c.end_section; s++) {
        const range = timeMap[s];
        if (range && nowMinutes >= range[0] && nowMinutes <= range[1]) {
          return c;
        }
      }
    }
    return null;
  }, [todayCourses, nowMinutes, timeMap]);

  if (anyLoading && !hasAnyData) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid gap-6 md:grid-cols-2">
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
    <div className="flex flex-col gap-6 md:gap-8">
      <Card className="md:hidden">
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <Avatar className="size-14 shrink-0">
            {avatarImage && <AvatarImage src={avatarImage} alt="avatar" />}
            <AvatarFallback className="text-base font-medium">
              {student.data?.name ? student.data.name.slice(-2) : "--"}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <CardTitle className="truncate text-base">{student.data?.name || "-"}</CardTitle>
            {student.data?.department && (
              <CardDescription className="truncate">
                {student.data.department}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 border-t pt-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0 text-primary" />
              <span className="truncate text-sm font-medium">
                {t("dashboard.currentWeek", { week: currentWeek.data?.week || "-" })}
              </span>
            </div>
            <span className="truncate text-xs text-muted-foreground">
              {currentWeek.data?.weekday ? t(`dashboard.weekdayNames.${currentWeek.data.weekday}`) : "-"}
              {currentWeek.data?.term && ` · ${currentWeek.data.term}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowGPA((v) => !v)}
            className="flex min-w-0 flex-col gap-0.5 text-left transition-opacity active:opacity-70"
          >
            <div className="flex items-center gap-1.5">
              <BarChart3 className="size-3.5 shrink-0 text-primary" />
              <span className="truncate text-sm font-medium">{t("dashboard.gpaInitial")}</span>
              {showGPA ? (
                <EyeOff className="ml-auto size-3 shrink-0 text-muted-foreground" />
              ) : (
                <Eye className="ml-auto size-3 shrink-0 text-muted-foreground" />
              )}
            </div>
            <span className="truncate text-base font-semibold tabular-nums">
              {showGPA ? gpa.data?.gpa_initial || "-" : "***"}
            </span>
          </button>
        </CardContent>
      </Card>

      <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <GraduationCap className="size-6 text-primary shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{student.data?.name || "-"}</CardTitle>
              <CardDescription className="truncate">{student.data?.student_id || ""}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground truncate">
            {student.data?.department} · {student.data?.major}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Calendar className="size-6 text-primary shrink-0" />
            <div>
              <CardTitle className="text-base">{t("dashboard.currentWeek", { week: currentWeek.data?.week || "-" })}</CardTitle>
              <CardDescription>{currentWeek.data?.weekday ? t(`dashboard.weekdayNames.${currentWeek.data.weekday}`) : "-"}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {currentWeek.data?.term || ""}
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" onClick={() => setShowGPA((v) => !v)}>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <BarChart3 className="size-6 text-primary shrink-0" />
            <div>
              <CardTitle className="text-base">
                {showGPA ? gpa.data?.gpa_initial || "-" : "***"}
              </CardTitle>
              <CardDescription>{t("dashboard.gpaInitial")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {showGPA
              ? `${t("dashboard.weightedAvg")} ${gpa.data?.weighted_avg || "-"} · ${t("dashboard.arithmeticAvg")} ${gpa.data?.arithmetic_avg || "-"}`
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
              {t("dashboard.currentCourse")}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {todayCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noCoursesToday")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {todayCourses.map((c, idx) => {
                const isCurrent = currentCourse === c;
                const isPast = !isCurrent && isCoursePast(c, nowMinutes, timeMap);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      isCurrent && "border-primary bg-primary/5",
                      isPast && "opacity-50",
                    )}
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
                );
              })}
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
                      {exam.exam_time} · {exam.exam_location}
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
