import { registerPlugin } from "@capacitor/core";
import type { Course, CurrentWeek, ClassPeriod, Exam } from "./types";
import type {
  Course as ProviderCourse,
  CurrentWeek as ProviderCurrentWeek,
  ClassPeriod as ProviderClassPeriod,
  Exam as ProviderExam,
} from "@/providers/types";

export interface WidgetBridgePlugin {
  syncSchedule(options: {
    coursesJson: string;
    currentWeekJson: string;
    syncReminderHours: number;
    showNextDaySchedule: boolean;
  }): Promise<void>;
  syncExams(options: {
    examsJson: string;
    syncReminderHours: number;
  }): Promise<void>;
  syncWidgetSettings(options: {
    syncReminderHours: number;
    showNextDaySchedule: boolean;
  }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge", {
  web: async () => {
    return {
      async syncSchedule() {
        // No-op on web
      },
      async syncExams() {
        // No-op on web
      },
      async syncWidgetSettings() {
        // No-op on web
      },
    };
  },
});

export interface WidgetCourse {
  name: string;
  classroom?: string;
  week_day: number;
  start_section: number;
  end_section: number;
  start_time?: string;
  end_time?: string;
}

export interface WidgetWeekInfo {
  week: number;
  weekday: number;
  term?: string;
  date?: string;
}

export interface WidgetExam {
  name: string;
  exam_name?: string;
  exam_date?: string;
  exam_time?: string;
  exam_location?: string;
  seat_number?: string;
}

type WidgetSyncCourse = Course | ProviderCourse;
type WidgetSyncCurrentWeek = CurrentWeek | ProviderCurrentWeek;
type WidgetSyncClassPeriod = ClassPeriod | ProviderClassPeriod;

function getCourseNumberField(
  course: WidgetSyncCourse,
  legacyKey: keyof Course,
  providerKey: keyof ProviderCourse,
): number {
  return ((course as Course)[legacyKey] ?? (course as ProviderCourse)[providerKey]) as number;
}

function getPeriodStringField(
  period: WidgetSyncClassPeriod | undefined,
  legacyKey: keyof ClassPeriod,
  providerKey: keyof ProviderClassPeriod,
): string | undefined {
  if (!period) return undefined;
  return (
    (period as ClassPeriod)[legacyKey] ?? (period as ProviderClassPeriod)[providerKey]
  ) as string | undefined;
}

function getWeekTerm(week: WidgetSyncCurrentWeek): string | undefined {
  return (week as CurrentWeek).term ?? (week as ProviderCurrentWeek).semester;
}

export async function syncScheduleToWidget(
  courses: WidgetSyncCourse[],
  currentWeek: WidgetSyncCurrentWeek | null,
  periods: WidgetSyncClassPeriod[],
  syncReminderHours: number = 24,
  showNextDaySchedule: boolean = false,
): Promise<void> {
  try {
    const periodMap = new Map(periods.map((p) => [p.section, p]));

    const widgetCourses: WidgetCourse[] = courses.map((c) => {
      const startSection = getCourseNumberField(c, "start_section", "startSection");
      const endSection = getCourseNumberField(c, "end_section", "endSection");
      const startPeriod = periodMap.get(startSection);
      const endPeriod = periodMap.get(endSection);
      return {
        name: c.name,
        classroom: c.classroom,
        week_day: getCourseNumberField(c, "week_day", "weekDay"),
        start_section: startSection,
        end_section: endSection,
        start_time: getPeriodStringField(startPeriod, "start_time", "startTime"),
        end_time: getPeriodStringField(endPeriod, "end_time", "endTime"),
      };
    });

    const weekInfo: WidgetWeekInfo | null = currentWeek
      ? {
          week: currentWeek.week,
          weekday: currentWeek.weekday,
          term: getWeekTerm(currentWeek),
          date: currentWeek.date,
        }
      : null;

    await WidgetBridge.syncSchedule({
      coursesJson: JSON.stringify(widgetCourses),
      currentWeekJson: weekInfo ? JSON.stringify(weekInfo) : "",
      syncReminderHours,
      showNextDaySchedule,
    });
  } catch {
    // Widget sync is best-effort; fail silently
  }
}

export async function syncWidgetSettingsToWidget(
  syncReminderHours: number,
  showNextDaySchedule: boolean = false,
): Promise<void> {
  try {
    await WidgetBridge.syncWidgetSettings({ syncReminderHours, showNextDaySchedule });
  } catch {
    // Widget sync is best-effort; fail silently
  }
}

type WidgetSyncExam = Exam | ProviderExam;

function getExamField(
  exam: WidgetSyncExam,
  legacyKey: keyof Exam,
  providerKey: keyof ProviderExam,
): string | undefined {
  return (
    (exam as Exam)[legacyKey] ?? (exam as ProviderExam)[providerKey]
  ) as string | undefined;
}

export async function syncExamsToWidget(
  exams: WidgetSyncExam[],
  syncReminderHours: number = 24,
): Promise<void> {
  try {
    const widgetExams: WidgetExam[] = exams.map((e) => ({
      name: e.name,
      exam_name: getExamField(e, "exam_name", "examName"),
      exam_date: getExamField(e, "exam_date", "examDate"),
      exam_time: getExamField(e, "exam_time", "examTime"),
      exam_location: getExamField(e, "exam_location", "examLocation"),
      seat_number: getExamField(e, "seat_number", "seatNumber"),
    }));

    await WidgetBridge.syncExams({
      examsJson: JSON.stringify(widgetExams),
      syncReminderHours,
    });
  } catch {
    // Widget sync is best-effort; fail silently
  }
}
