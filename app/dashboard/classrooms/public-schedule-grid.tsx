"use client";

import { useMemo } from "react";
import { CalendarOff } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import type { ClassPeriod, Course, PublicScheduleEntry } from "@/providers/types";
import { COURSE_BG_CLASSES, courseColorIndex } from "../schedule/course-color";
import {
  computeMergedBlocks,
  periodEndTime,
  periodStartTime,
  type ScheduleBlock,
} from "../schedule/schedule-utils";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const LUNCH_AFTER = 4;
const DINNER_AFTER = 8;

interface Props {
  entries: PublicScheduleEntry[];
  periods: ClassPeriod[];
  week: number;
  secondary: "class" | "room";
}

interface PublicCourse extends Course {
  secondaryText?: string;
  weeksText?: string;
}

export function PublicScheduleGrid({ entries, periods, week, secondary }: Props) {
  const { t } = useTranslation();
  const courses = useMemo<PublicCourse[]>(
    () =>
      entries
        .filter((entry) => !entry.weekList?.length || entry.weekList.includes(week))
        .filter(
          (entry) =>
            entry.weekday >= 1 &&
            entry.weekday <= 7 &&
            entry.startSection > 0 &&
            entry.endSection >= entry.startSection,
        )
        .map((entry) => ({
          name: entry.courseName || "-",
          code: entry.courseCode,
          teacher: entry.teacher,
          classroom: secondary === "room" ? entry.classroom : entry.className,
          weekDay: entry.weekday,
          startSection: entry.startSection,
          endSection: entry.endSection,
          weeks: entry.weeks,
          weekList: entry.weekList,
          classId: entry.classId,
          raw: entry.metadata,
          secondaryText: secondary === "room" ? entry.classroom : entry.className,
          weeksText: entry.weeks,
        })),
    [entries, secondary, week],
  );

  const activePeriods = useMemo(
    () => periods.filter((period) => period.isInUse && period.section > 0),
    [periods],
  );
  const mergedBlocks = useMemo(
    () => computeMergedBlocks(courses, activePeriods),
    [activePeriods, courses],
  );

  const { sectionToRow, totalRows, lunchRow, dinnerRow } = useMemo(() => {
    const map = new Map<number, number>();
    let row = 2;
    let lunch: number | null = null;
    let dinner: number | null = null;
    const sections = new Set(activePeriods.map((period) => period.section));
    for (const period of activePeriods) {
      if (period.section === LUNCH_AFTER + 1 && sections.has(LUNCH_AFTER)) {
        lunch = row++;
      }
      if (period.section === DINNER_AFTER + 1 && sections.has(DINNER_AFTER)) {
        dinner = row++;
      }
      map.set(period.section, row++);
    }
    return {
      sectionToRow: map,
      totalRows: row - 1,
      lunchRow: lunch,
      dinnerRow: dinner,
    };
  }, [activePeriods]);

  const gridTemplateRows = useMemo(() => {
    const sizes = ["auto"];
    for (let row = 2; row <= totalRows; row += 1) {
      sizes.push(row === lunchRow || row === dinnerRow ? "18px" : "minmax(54px, 1fr)");
    }
    return sizes.join(" ");
  }, [dinnerRow, lunchRow, totalRows]);

  function blockStyle(block: ScheduleBlock<PublicCourse>) {
    const startRow = sectionToRow.get(block.start);
    const endRow = sectionToRow.get(block.end);
    if (!startRow || !endRow) return { display: "none" as const };
    return {
      gridRow: `${startRow} / ${endRow + 1}`,
      gridColumn: `${block.day + 1}`,
    };
  }

  if (courses.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarOff />
          </EmptyMedia>
          <EmptyTitle>{t("classrooms.noSchedule")}</EmptyTitle>
          <EmptyDescription>{t("classrooms.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border">
      <div
        className="grid min-w-[760px]"
        style={{
          gridTemplateColumns: "48px repeat(7, minmax(96px, 1fr))",
          gridTemplateRows,
        }}
      >
        <div className="border-b border-r border-border bg-muted/30" />
        {DAYS.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center border-b border-r border-border bg-muted/30 py-2 text-xs font-medium last:border-r-0"
          >
            {t(`dashboard.weekdayShort.${day}`)}
          </div>
        ))}

        {activePeriods.map((period) => {
          const row = sectionToRow.get(period.section);
          if (!row) return null;
          return (
            <div
              key={period.section}
              className="flex flex-col items-center justify-center border-b border-r border-border text-[9px] text-muted-foreground"
              style={{ gridRow: row, gridColumn: 1 }}
            >
              <span className="text-xs font-semibold text-foreground">{period.section}</span>
              {periodStartTime(period) && <span>{periodStartTime(period)}</span>}
              {periodEndTime(period) && <span>{periodEndTime(period)}</span>}
            </div>
          );
        })}

        {lunchRow !== null && (
          <div
            className="flex items-center justify-center border-b border-border bg-muted/40 text-[9px] text-muted-foreground"
            style={{ gridRow: lunchRow, gridColumn: "1 / -1" }}
          >
            {t("schedule.lunchBreak")}
          </div>
        )}
        {dinnerRow !== null && (
          <div
            className="flex items-center justify-center border-b border-border bg-muted/40 text-[9px] text-muted-foreground"
            style={{ gridRow: dinnerRow, gridColumn: "1 / -1" }}
          >
            {t("schedule.dinnerBreak")}
          </div>
        )}

        {DAYS.flatMap((day) =>
          activePeriods.map((period) => {
            const row = sectionToRow.get(period.section);
            if (!row) return null;
            return (
              <div
                key={`${day}-${period.section}`}
                className="border-b border-r border-border last:border-r-0"
                style={{ gridRow: row, gridColumn: day + 1 }}
              />
            );
          }),
        )}

        {mergedBlocks.map((block, index) => {
          const primary = block.courses[0]!;
          return (
            <div
              key={`${block.day}-${block.start}-${index}`}
              className={cn(
                "relative z-10 m-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden rounded-md p-1.5",
                COURSE_BG_CLASSES[courseColorIndex(primary)],
              )}
              style={blockStyle(block)}
              title={block.courses
                .map((course) =>
                  [course.name, course.secondaryText, course.teacher, course.weeksText]
                    .filter(Boolean)
                    .join(" · "),
                )
                .join("\n")}
            >
              {block.courses.slice(0, 2).map((course, courseIndex) => (
                <div
                  key={`${course.code}-${courseIndex}`}
                  className={cn(courseIndex > 0 && "border-t border-foreground/10 pt-1")}
                >
                  <p className="line-clamp-2 text-[11px] font-medium leading-tight">
                    {course.name}
                  </p>
                  {course.secondaryText && (
                    <p className="line-clamp-1 text-[9px] text-foreground/70">
                      {course.secondaryText}
                    </p>
                  )}
                  {course.teacher && (
                    <p className="line-clamp-1 text-[9px] text-foreground/60">
                      {course.teacher}
                    </p>
                  )}
                </div>
              ))}
              {block.courses.length > 2 && (
                <span className="text-[9px] text-foreground/60">
                  +{block.courses.length - 2}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
