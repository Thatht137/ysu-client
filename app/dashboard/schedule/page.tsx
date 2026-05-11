"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getExperimentalSchedule, getClassPeriods, getCurrentWeek } from "@/lib/api";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";
import type { Course, ClassPeriod, CurrentWeek } from "@/lib/types";
import { CalendarOff, ChevronLeft, ChevronRight, Search } from "lucide-react";

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

function isCourseActiveInWeek(course: Course, week: number): boolean {
  const weeks = parseWeeks(course.weeks || "");
  if (weeks.length === 0) return true;
  return weeks.includes(week);
}

function coursesSignature(courses: Course[]): string {
  return courses
    .map((c) => `${c.code ?? ""}|${c.name ?? ""}|${c.teacher ?? ""}|${c.classroom ?? ""}`)
    .sort()
    .join("\n");
}

interface GridCell {
  courses: Course[];
}

export default function SchedulePage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [periods, setPeriods] = useState<ClassPeriod[]>([]);
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [overlapDialog, setOverlapDialog] = useState<{ day: number; section: number; courses: Course[] } | null>(null);

  const WEEKDAYS = ["", t("dashboard.weekdayNames.1"), t("dashboard.weekdayNames.2"), t("dashboard.weekdayNames.3"), t("dashboard.weekdayNames.4"), t("dashboard.weekdayNames.5"), t("dashboard.weekdayNames.6"), t("dashboard.weekdayNames.7")];

  function shiftWeek(delta: number) {
    setSelectedWeek((w) => Math.max(1, (w || 1) + delta));
  }

  useEffect(() => {
    if (!credential) return;

    const cachedCourses = cacheGet<Course[]>(cacheKey(["schedule", credential]));
    const cachedPeriods = cacheGet<ClassPeriod[]>(cacheKey(["periods", credential]));
    const cachedWeek = cacheGet<CurrentWeek>(cacheKey(["week", credential]));

    if (cachedCourses) setCourses(cachedCourses);
    if (cachedPeriods) setPeriods(cachedPeriods);
    if (cachedWeek) {
      setCurrentWeek(cachedWeek);
      if (cachedWeek.week) setSelectedWeek(cachedWeek.week);
    }

    if (cachedCourses || cachedPeriods || cachedWeek) {
      setLoading(false);
      toast.info(t("app.updating"));
    }

    async function load() {
      try {
        const [c, p, w] = await Promise.all([
          getExperimentalSchedule(credential!, undefined, "all").catch(() => []),
          getClassPeriods(credential!).catch(() => []),
          getCurrentWeek(credential!).catch(() => null),
        ]);
        setCourses(c);
        setPeriods(p.filter((x) => x.is_in_use).sort((a, b) => a.section - b.section));
        setCurrentWeek(w);
        if (w?.week) setSelectedWeek(w.week);
        cacheSet(cacheKey(["schedule", credential!]), c);
        cacheSet(cacheKey(["periods", credential!]), p.filter((x) => x.is_in_use).sort((a, b) => a.section - b.section));
        cacheSet(cacheKey(["week", credential!]), w);
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
      const [c, w] = await Promise.all([
        getExperimentalSchedule(credential, term || undefined, "all").catch(() => []),
        getCurrentWeek(credential!, term || undefined).catch(() => null),
      ]);
      setCourses(c);
      setCurrentWeek(w);
      if (w?.week) setSelectedWeek(w.week);
      cacheSet(cacheKey(["schedule", credential!]), c);
      cacheSet(cacheKey(["week", credential!]), w);
    } catch (err) {
      toast.error((err as Error).message || t("app.updating"));
    } finally {
      setLoading(false);
    }
  }

  const filteredCourses = useMemo(() => {
    if (selectedWeek <= 0) return courses;
    return courses.filter((c) => isCourseActiveInWeek(c, selectedWeek));
  }, [courses, selectedWeek]);

  const grid = useMemo(() => {
    const maxSection = periods.length > 0 ? periods[periods.length - 1].section : 12;
    const g: GridCell[][] = Array.from({ length: maxSection + 1 }, () =>
      Array.from({ length: 8 }, () => ({ courses: [] })),
    );
    for (const c of filteredCourses) {
      if (c.week_day >= 1 && c.week_day <= 7 && c.start_section >= 1) {
        for (let s = c.start_section; s <= c.end_section; s++) {
          if (s <= maxSection) {
            g[s][c.week_day].courses.push(c);
          }
        }
      }
    }
    return g;
  }, [filteredCourses, periods]);

  const mergedBlocks = useMemo(() => {
    const blocks: { day: number; start: number; end: number; courses: Course[] }[] = [];
    const maxSection = periods.length > 0 ? periods[periods.length - 1].section : 12;
    for (let day = 1; day <= 7; day++) {
      let section = 1;
      while (section <= maxSection) {
        const cell = grid[section][day];
        if (cell.courses.length === 0) {
          section++;
          continue;
        }
        const sig = coursesSignature(cell.courses);
        let end = section;
        while (
          end + 1 <= maxSection &&
          grid[end + 1][day].courses.length === cell.courses.length &&
          coursesSignature(grid[end + 1][day].courses) === sig
        ) {
          end++;
        }
        blocks.push({ day, start: section, end, courses: cell.courses });
        section = end + 1;
      }
    }
    return blocks;
  }, [grid, periods]);

  function blockStyle(block: { day: number; start: number; end: number }) {
    const rowStart = periods.findIndex((p) => p.section === block.start) + 2;
    const rowEnd = periods.findIndex((p) => p.section === block.end) + 3;
    const colStart = block.day + 1;
    return {
      gridRow: `${rowStart} / ${rowEnd}`,
      gridColumn: `${colStart}`,
    };
  }

  const currentWeekday = currentWeek?.weekday ?? 0;

  if (loading && courses.length === 0) {
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
          <CardTitle>{t("schedule.title")}</CardTitle>
          <CardDescription>{t("schedule.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="flex flex-row flex-wrap items-end gap-3">
            <Field className="w-48">
              <FieldLabel htmlFor="schedule-term">{t("schedule.termLabel")}</FieldLabel>
              <Input
                id="schedule-term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={t("schedule.termPlaceholder")}
              />
            </Field>
            <Field className="min-w-[16rem]">
              <FieldLabel htmlFor="schedule-week">{t("schedule.weekLabel")}</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => shiftWeek(-1)}
                    aria-label={t("schedule.weekPrev")}
                  >
                    <ChevronLeft />
                  </Button>
                  <Input
                    id="schedule-week"
                    type="number"
                    value={selectedWeek || ""}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10) || 0)}
                    placeholder={t("schedule.weeks")}
                    className="w-20 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => shiftWeek(1)}
                    aria-label={t("schedule.weekNext")}
                  >
                    <ChevronRight />
                  </Button>
                </div>
                {currentWeek?.week && (
                  <Badge variant="secondary">{t("schedule.currentWeekBadge", { week: currentWeek.week })}</Badge>
                )}
              </div>
            </Field>
            <Button onClick={handleQuery} disabled={loading}>
              {loading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Search data-icon="inline-start" />
              )}
              {t("schedule.query")}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {courses.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarOff />
                </EmptyMedia>
                <EmptyTitle>{t("schedule.noData")}</EmptyTitle>
                <EmptyDescription>{t("schedule.description")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-auto">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `80px repeat(7, minmax(140px, 1fr))`,
                  gridTemplateRows: `auto repeat(${periods.length}, minmax(60px, auto))`,
                }}
              >
                <div className="border p-2 text-sm font-medium bg-muted/50">{t("schedule.sections")}</div>
                {WEEKDAYS.slice(1).map((d, idx) => (
                  <div
                    key={d}
                    className={`border p-2 text-center text-sm font-medium ${
                      idx + 1 === currentWeekday
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50"
                    }`}
                  >
                    {d}
                  </div>
                ))}

                {periods.map((p) => (
                  <div
                    key={p.section}
                    className="border p-2 text-xs text-muted-foreground flex flex-col justify-center"
                    style={{ gridColumn: 1 }}
                  >
                    <span className="font-medium text-foreground">{p.name || t("dashboard.sectionRange", { start: p.section, end: p.section })}</span>
                    <span>{p.start_time}-{p.end_time}</span>
                  </div>
                ))}

                {mergedBlocks.map((block, idx) => (
                  <div
                    key={idx}
                    className={`border p-1 ${
                      block.day === currentWeekday ? "bg-primary/5" : ""
                    }`}
                    style={blockStyle(block)}
                  >
                    {block.courses.length === 1 ? (
                      <div className="h-full rounded-md bg-primary/10 p-2 flex flex-col justify-center gap-0.5 overflow-hidden">
                        <div className="font-medium text-xs truncate">{block.courses[0].name}</div>
                        <div className="text-xs text-muted-foreground truncate">{block.courses[0].teacher}</div>
                        <div className="text-xs text-muted-foreground truncate">{block.courses[0].classroom}</div>
                        <div className="text-xs text-muted-foreground">{block.courses[0].weeks}</div>
                      </div>
                    ) : (
                      <button
                        className="h-full w-full rounded-md bg-accent p-2 flex flex-col items-center justify-center gap-1 hover:bg-accent/80"
                        onClick={() =>
                          setOverlapDialog({
                            day: block.day,
                            section: block.start,
                            courses: block.courses,
                          })
                        }
                      >
                        <Badge variant="secondary">{t("schedule.overlapCourses", { count: block.courses.length })}</Badge>
                        <span className="text-xs text-muted-foreground">{t("schedule.expand")}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!overlapDialog} onOpenChange={(v) => !v && setOverlapDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {overlapDialog && t("schedule.overlapDialogTitle", { weekday: WEEKDAYS[overlapDialog.day], section: overlapDialog.section })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {overlapDialog?.courses.map((c, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <CardDescription>{c.teacher} · {c.classroom}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t("schedule.weeks")}: {c.weeks} · {t("schedule.sections")}: {c.start_section}-{c.end_section}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
