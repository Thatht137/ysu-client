/**
 * Provider 层统一导出
 */

export type {
  AcademicProvider,
  AcademicCapabilities,
  Credential,
  GradeQueryOptions,
  ScheduleQueryOptions,
  ExamQueryOptions,
  StudentInfo,
  Grade,
  GPAStats,
  Course,
  Exam,
  EvaluationTask,
  EvaluationDetail,
  EvaluationAnswer,
  Question,
  QuestionOption,
  TrainingPlan,
  AcademicWarning,
  AcademicCompletion,
} from "./types";

export {
  ProviderError,
  ProviderErrorCode,
  isProviderError,
  wrapError,
} from "./errors";

export {
  ALL_CAPABILITIES,
  NO_CAPABILITIES,
  hasCapability,
  getEnabledCapabilities,
} from "./capabilities";

export { YSUProvider } from "./ysu";
