"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/auth-store";
import { getExperimentalSchedule, getClassPeriods, getCurrentWeek } from "@/lib/api";
import type { Course, ClassPeriod, CurrentWeek } from "@/lib/types";

const WEEKDAYS = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

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

interface GridCell {
  courses: Course[];
}

export default function SchedulePage() {
  const credential = useAuthStore((s) => s.credential);
  const [courses, setCourses] = useState<Course[]>([]);
  const [periods, setPeriods] = useState<ClassPeriod[]>([]);
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [overlapDialog, setOverlapDialog] = useState<{ day: number; section: number; courses: Course[] } | null>(null);

  useEffect(() => {
    if (!credential) return;
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
      } catch (err) {
        toast.error((err as Error).message || "加载失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [credential]);

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
    } catch (err) {
      toast.error((err as Error).message || "查询失败");
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

  // For each day, compute merged blocks: consecutive sections with the same single course
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
        // When single course, try to merge consecutive sections
        if (cell.courses.length === 1) {
          const course = cell.courses[0];
          let end = section;
          while (
            end + 1 <= maxSection &&
            grid[end + 1][day].courses.length === 1 &&
            grid[end + 1][day].courses[0].code === course.code &&
            grid[end + 1][day].courses[0].name === course.name
          ) {
            end++;
          }
          blocks.push({ day, start: section, end, courses: [course] });
          section = end + 1;
        } else {
          // Multiple courses at this section - don't merge
          blocks.push({ day, start: section, end: section, courses: cell.courses });
          section++;
        }
      }
    }
    return blocks;
  }, [grid, periods]);

  function blockStyle(block: { day: number; start: number; end: number }) {
    const rowStart = periods.findIndex((p) => p.section === block.start) + 2; // +2 because header is row 1
    const rowEnd = periods.findIndex((p) => p.section === block.end) + 3; // span to after the last section
    const colStart = block.day + 1;
    return {
      gridRow: `${rowStart} / ${rowEnd}`,
      gridColumn: `${colStart}`,
    };
  }

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
          <CardTitle>课表查询</CardTitle>
          <CardDescription>查看课程安排（含实验选课），选择周次筛选</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">学期</label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="如 2024-2025-1" className="w-48" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">周次</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={selectedWeek || ""}
                  onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10) || 0)}
                  placeholder="全部"
                  className="w-24"
                />
                {currentWeek?.week && (
                  <Badge variant="secondary">当前第 {currentWeek.week} 周</Badge>
                )}
              </div>
            </div>
            <Button onClick={handleQuery}>查询</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {courses.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无课表数据</p>
          ) : (
            <div className="overflow-auto">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `80px repeat(7, minmax(140px, 1fr))`,
                  gridTemplateRows: `auto repeat(${periods.length}, minmax(60px, auto))`,
                }}
              >
                {/* Header */}
                <div className="border p-2 text-sm font-medium bg-muted/50">节次</div>
                {WEEKDAYS.slice(1).map((d) => (
                  <div key={d} className="border p-2 text-center text-sm font-medium bg-muted/50">
                    {d}
                  </div>
                ))}

                {/* Period labels */}
                {periods.map((p) => (
                  <div
                    key={p.section}
                    className="border p-2 text-xs text-muted-foreground flex flex-col justify-center"
                    style={{ gridColumn: 1 }}
                  >
                    <span className="font-medium text-foreground">{p.name || `第${p.section}节`}</span>
                    <span>{p.start_time}-{p.end_time}</span>
                  </div>
                ))}

                {/* Merged course blocks */}
                {mergedBlocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="border p-1"
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
                        <Badge variant="secondary">{block.courses.length} 个课程</Badge>
                        <span className="text-xs text-muted-foreground">点击展开</span>
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
              {overlapDialog && `${WEEKDAYS[overlapDialog.day]} 第${overlapDialog.section}节`}
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
                  周次: {c.weeks} · 节次: {c.start_section}-{c.end_section}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
