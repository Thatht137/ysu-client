/**
 * EMAP data fetcher wrapper for YSU Provider.
 *
 * Wraps lib/jwxt.ts functions with withJWXT() helper that persists
 * JWXT session after successful calls and maps errors to ProviderError.
 */
import { persistJWXTSession } from "../../lib/sdk";
import {
  NotLoggedInError,
  JWXTBusinessError,
  JWXTProtocolError,
  JWXTError,
} from "../../lib/jwxt";
import {
  ProviderError,
  ProviderErrorCode,
  wrapError,
} from "../errors";
import type {
  StudentInfo as JWXTStudentInfo,
  Grade as JWXTGrade,
  GPAStats as JWXTGPAStats,
  Course as JWXTCourse,
  CurrentWeek as JWXTCurrentWeek,
  Exam as JWXTExam,
  TrainingPlan as JWXTTrainingPlan,
  AcademicCompletion as JWXTAcademicCompletion,
  AcademicWarning as JWXTAcademicWarning,
  EvaluationType as JWXTEvaluationType,
  EvaluationTask as JWXTEvaluationTask,
  EvaluationDetail as JWXTEvaluationDetail,
  EvaluationAnswer as JWXTEvaluationAnswer,
} from "../../lib/jwxt";
import {
  queryStudentInfo as _queryStudentInfo,
  queryGrades as _queryGrades,
  queryGpaStats as _queryGpaStats,
  querySchedule as _querySchedule,
  queryScheduleExperimental as _queryScheduleExperimental,
  queryCurrentWeek as _queryCurrentWeek,
  queryExams as _queryExams,
  queryTrainingPlan as _queryTrainingPlan,
  queryAcademicCompletion as _queryAcademicCompletion,
  queryAcademicWarnings as _queryAcademicWarnings,
  queryEvaluationTypes as _queryEvaluationTypes,
  queryPendingEvaluations as _queryPendingEvaluations,
  getEvaluationDetail as _getEvaluationDetail,
  submitEvaluation as _submitEvaluation,
} from "../../lib/jwxt";

function mapJWXTError(e: unknown): ProviderError {
  if (e instanceof NotLoggedInError) {
    return new ProviderError(
      ProviderErrorCode.AUTH_SESSION_EXPIRED,
      e.message,
      e,
    );
  }
  if (e instanceof JWXTBusinessError) {
    return new ProviderError(
      ProviderErrorCode.UNKNOWN,
      e.msg ?? e.message,
      e,
    );
  }
  if (e instanceof JWXTProtocolError) {
    return new ProviderError(
      ProviderErrorCode.UNKNOWN,
      e.message,
      e,
    );
  }
  if (e instanceof JWXTError) {
    return new ProviderError(
      ProviderErrorCode.UNKNOWN,
      e.message,
      e,
    );
  }
  return wrapError(e);
}

/** JWXT call wrapper: persist session after success, map errors. */
async function withJWXT<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();
    // Persist JWXT session asynchronously, do not block return
    persistJWXTSession().catch(() => {});
    return result;
  } catch (e) {
    throw mapJWXTError(e);
  }
}

// ─── Thin wrappers ────────────────────────────────────────────────────────

export async function queryStudentInfo(): Promise<JWXTStudentInfo> {
  return withJWXT(() => _queryStudentInfo());
}

export async function queryGrades(opts?: {
  term?: string;
  courseName?: string;
  pageSize?: number;
  pageNumber?: number;
}): Promise<JWXTGrade[]> {
  return withJWXT(() => _queryGrades(opts));
}

export async function queryGpaStats(opts?: {
  studentId?: string;
}): Promise<JWXTGPAStats> {
  return withJWXT(() => _queryGpaStats(opts));
}

export async function querySchedule(opts?: {
  term?: string;
}): Promise<JWXTCourse[]> {
  return withJWXT(() => _querySchedule(opts));
}

export async function queryExperimentalSchedule(opts?: {
  term?: string;
  studentId?: string;
  courseCategory?: string;
}): Promise<JWXTCourse[]> {
  return withJWXT(() => _queryScheduleExperimental(opts));
}

export async function queryCurrentWeek(opts?: {
  term?: string;
  date?: string;
}): Promise<JWXTCurrentWeek> {
  return withJWXT(() => _queryCurrentWeek(opts));
}

export async function queryExams(opts?: {
  term?: string;
}): Promise<JWXTExam[]> {
  return withJWXT(() => _queryExams(opts));
}

export async function queryTrainingPlan(opts?: {
  pageSize?: number;
  pageNumber?: number;
}): Promise<JWXTTrainingPlan[]> {
  return withJWXT(() => _queryTrainingPlan(opts));
}

export async function queryAcademicCompletion(): Promise<JWXTAcademicCompletion> {
  return withJWXT(() => _queryAcademicCompletion());
}

export async function queryAcademicWarnings(): Promise<JWXTAcademicWarning[]> {
  return withJWXT(() => _queryAcademicWarnings());
}

export async function queryEvaluationTypes(opts?: {
  term?: string;
}): Promise<JWXTEvaluationType[]> {
  return withJWXT(() => _queryEvaluationTypes(opts));
}

export async function queryPendingEvaluations(
  evalType: string,
  opts?: { term?: string },
): Promise<JWXTEvaluationTask[]> {
  return withJWXT(() => _queryPendingEvaluations(evalType, opts));
}

export async function queryEvaluationDetail(
  groupNo: string,
  evalType: string,
  opts?: { sequence?: number },
): Promise<JWXTEvaluationDetail> {
  return withJWXT(() => _getEvaluationDetail(groupNo, evalType, opts));
}

export async function submitEvaluation(
  groupNo: string,
  wjid: string,
  evalType: string,
  answers: readonly JWXTEvaluationAnswer[],
  opts?: {
    teacherRelationId?: string;
    courseName?: string;
    teacherName?: string;
    sequence?: number;
  },
): Promise<void> {
  return withJWXT(() =>
    _submitEvaluation(groupNo, wjid, evalType, answers, opts),
  );
}
