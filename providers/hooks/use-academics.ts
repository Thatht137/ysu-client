"use client";

import { useProvider } from "../use-provider";
import type {
  AcademicCompletion,
  AcademicWarning,
  ClassPeriod,
  Classroom,
  Course,
  CurrentWeek,
  CurrentWeekQueryOptions,
  Exam,
  ExamQueryOptions,
  GPAQueryOptions,
  GPAStats,
  Grade,
  GradeAnalyticsQueryOptions,
  GradeDistribution,
  GradeQueryOptions,
  GradeRanking,
  GradeRankingQueryOptions,
  GradeStatistics,
  PageQueryOptions,
  PublicScheduleEntry,
  PublicScheduleListOptions,
  PublicScheduleQueryOptions,
  ScheduleQueryOptions,
  TermCalendar,
  TermCalendarQueryOptions,
  TeachingClass,
  TrainingPlan,
} from "../types";
import { useProviderQuery, type ProviderQueryResult } from "./use-provider-query";

export function useGrades(options?: GradeQueryOptions): ProviderQueryResult<Grade[]> {
  const provider = useProvider();
  return useProviderQuery("grades", "grades", () => provider.getGrades(options), options);
}

export function useGPAStats(options?: GPAQueryOptions): ProviderQueryResult<GPAStats> {
  const provider = useProvider();
  return useProviderQuery("gpa", "gpa-stats", () => provider.getGPAStats(options), options);
}

export function useGradeStatistics(
  options?: GradeAnalyticsQueryOptions,
): ProviderQueryResult<GradeStatistics> {
  const provider = useProvider();
  return useProviderQuery(
    "gradeAnalytics",
    "grade-statistics",
    () => provider.getGradeStatistics(options),
    options,
  );
}

export function useGradeDistribution(
  options?: GradeAnalyticsQueryOptions,
): ProviderQueryResult<GradeDistribution[]> {
  const provider = useProvider();
  return useProviderQuery(
    "gradeAnalytics",
    "grade-distribution",
    () => provider.getGradeDistribution(options),
    options,
  );
}

export function useGradeRanking(
  options?: GradeRankingQueryOptions,
): ProviderQueryResult<GradeRanking> {
  const provider = useProvider();
  return useProviderQuery(
    "gradeAnalytics",
    "grade-ranking",
    () => provider.getGradeRanking(options),
    options,
  );
}

export function useSchedule(options?: ScheduleQueryOptions): ProviderQueryResult<Course[]> {
  const provider = useProvider();
  return useProviderQuery("schedule", "schedule", () => provider.getSchedule(options), options);
}

export function useClassPeriods(): ProviderQueryResult<ClassPeriod[]> {
  const provider = useProvider();
  return useProviderQuery("classPeriods", "class-periods", () => provider.getClassPeriods());
}

export function useTermCalendar(
  options?: TermCalendarQueryOptions,
): ProviderQueryResult<TermCalendar> {
  const provider = useProvider();
  return useProviderQuery(
    "termCalendar",
    "term-calendar",
    () => provider.getTermCalendar(options),
    options,
  );
}

export function useCurrentWeek(
  options?: CurrentWeekQueryOptions,
): ProviderQueryResult<CurrentWeek> {
  const provider = useProvider();
  return useProviderQuery(
    "currentWeek",
    "current-week",
    () => provider.getCurrentWeek(options),
    options,
  );
}

export function useClassrooms(
  options?: PublicScheduleListOptions,
): ProviderQueryResult<Classroom[]> {
  const provider = useProvider();
  return useProviderQuery(
    "publicSchedule",
    "public-classrooms",
    () => provider.getClassrooms(options),
    options,
  );
}

export function useTeachingClasses(
  options?: PublicScheduleListOptions,
): ProviderQueryResult<TeachingClass[]> {
  const provider = useProvider();
  return useProviderQuery(
    "publicSchedule",
    "public-classes",
    () => provider.getTeachingClasses(options),
    options,
  );
}

export function useClassroomSchedule(
  options?: PublicScheduleQueryOptions,
): ProviderQueryResult<PublicScheduleEntry[]> {
  const provider = useProvider();
  return useProviderQuery(
    "publicSchedule",
    "classroom-schedule",
    () => provider.getClassroomSchedule(options),
    options,
  );
}

export function useTeachingClassSchedule(
  options?: PublicScheduleQueryOptions,
): ProviderQueryResult<PublicScheduleEntry[]> {
  const provider = useProvider();
  return useProviderQuery(
    "publicSchedule",
    "teaching-class-schedule",
    () => provider.getTeachingClassSchedule(options),
    options,
  );
}

export function useExams(options?: ExamQueryOptions): ProviderQueryResult<Exam[]> {
  const provider = useProvider();
  return useProviderQuery("exams", "exams", () => provider.getExams(options), options);
}

export function useTrainingPlan(
  options?: PageQueryOptions,
): ProviderQueryResult<TrainingPlan[]> {
  const provider = useProvider();
  return useProviderQuery(
    "trainingPlan",
    "training-plan",
    () => provider.getTrainingPlan(options),
    options,
  );
}

export function useAcademicCompletion(): ProviderQueryResult<AcademicCompletion> {
  const provider = useProvider();
  return useProviderQuery(
    "trainingPlan",
    "academic-completion",
    () => provider.getAcademicCompletion(),
  );
}

export function useAcademicWarnings(): ProviderQueryResult<AcademicWarning[]> {
  const provider = useProvider();
  return useProviderQuery(
    "trainingPlan",
    "academic-warnings",
    () => provider.getAcademicWarnings(),
  );
}
