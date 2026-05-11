import type {
  ApiError,
  CalculateScoreRequest,
  CaptchaResponse,
  Course,
  CurrentWeek,
  EvaluationDetail,
  EvaluationTask,
  EvaluationType,
  Exam,
  GPAStats,
  Grade,
  LoginRequest,
  LoginResponse,
  MFAChallengeResponse,
  MFARequestCodeRequest,
  MFASubmitRequest,
  StatusResponse,
  Step1Request,
  Step1Response,
  StudentInfo,
  SubmitEvaluationRequest,
  TermCalendar,
  AcademicCompletion,
  AcademicWarning,
  TrainingPlan,
  ClassPeriod,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:11920";

async function _fetch<T>(
  path: string,
  options?: RequestInit,
  credential?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (credential) {
    headers["X-CAS-Credential"] = credential;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ detail: res.statusText }));
    const error = new Error(err.detail || res.statusText);
    (error as Error & { code?: string; status?: number }).code = err.code;
    (error as Error & { code?: string; status?: number }).status = res.status;
    throw error;
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────────

export function fetchCaptcha(username: string): Promise<CaptchaResponse> {
  return _fetch("/auth/captcha", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function loginStep1(payload: Step1Request): Promise<Step1Response> {
  return _fetch("/auth/login/step1", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestMFACode(
  payload: MFARequestCodeRequest,
  credential: string,
): Promise<MFAChallengeResponse> {
  return _fetch(
    "/auth/login/mfa/request",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    credential,
  );
}

export function submitMFACode(
  payload: MFASubmitRequest,
  credential: string,
): Promise<LoginResponse> {
  return _fetch(
    "/auth/login/mfa/submit",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    credential,
  );
}

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return _fetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function checkAuthStatus(credential: string): Promise<StatusResponse> {
  return _fetch("/auth/status", undefined, credential);
}

// ── Student Info ────────────────────────────────────────

export function getStudentInfo(credential: string): Promise<StudentInfo> {
  return _fetch("/jwxt/student/info", undefined, credential);
}

// ── Grades ──────────────────────────────────────────────

export function getGrades(
  credential: string,
  params?: { term?: string; course_name?: string; page_size?: number; page_number?: number },
): Promise<Grade[]> {
  const qs = new URLSearchParams();
  if (params?.term) qs.set("term", params.term);
  if (params?.course_name) qs.set("course_name", params.course_name);
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.page_number) qs.set("page_number", String(params.page_number));
  return _fetch(`/jwxt/grades?${qs.toString()}`, undefined, credential);
}

export function getGPAStats(credential: string, student_id?: string): Promise<GPAStats> {
  const qs = new URLSearchParams();
  if (student_id) qs.set("student_id", student_id);
  return _fetch(`/jwxt/gpa?${qs.toString()}`, undefined, credential);
}

// ── Schedule ────────────────────────────────────────────

export function getSchedule(credential: string, term?: string): Promise<Course[]> {
  const qs = new URLSearchParams();
  if (term) qs.set("term", term);
  return _fetch(`/jwxt/schedule?${qs.toString()}`, undefined, credential);
}

export function getExperimentalSchedule(
  credential: string,
  term?: string,
  course_category = "all",
): Promise<Course[]> {
  const qs = new URLSearchParams();
  if (term) qs.set("term", term);
  qs.set("course_category", course_category);
  return _fetch(`/jwxt/schedule/experimental?${qs.toString()}`, undefined, credential);
}

export function getUnscheduledCourses(
  credential: string,
  term?: string,
  course_category = "all",
): Promise<Course[]> {
  const qs = new URLSearchParams();
  if (term) qs.set("term", term);
  qs.set("course_category", course_category);
  return _fetch(`/jwxt/schedule/unscheduled?${qs.toString()}`, undefined, credential);
}

export function getClassPeriods(credential: string): Promise<ClassPeriod[]> {
  return _fetch("/jwxt/class-periods", undefined, credential);
}

export function getTermCalendar(credential: string, term?: string): Promise<TermCalendar> {
  const qs = new URLSearchParams();
  if (term) qs.set("term", term);
  return _fetch(`/jwxt/term-calendar?${qs.toString()}`, undefined, credential);
}

export function getCurrentWeek(
  credential: string,
  term?: string,
  date?: string,
): Promise<CurrentWeek> {
  const qs = new URLSearchParams();
  if (term) qs.set("term", term);
  if (date) qs.set("date", date);
  return _fetch(`/jwxt/current-week?${qs.toString()}`, undefined, credential);
}

// ── Exams ───────────────────────────────────────────────

export function getExams(credential: string, term?: string): Promise<Exam[]> {
  const qs = new URLSearchParams();
  if (term) qs.set("term", term);
  return _fetch(`/jwxt/exams?${qs.toString()}`, undefined, credential);
}

// ── Training Plan / Academic ────────────────────────────

export function getTrainingPlan(
  credential: string,
  params?: { page_size?: number; page_number?: number },
): Promise<TrainingPlan[]> {
  const qs = new URLSearchParams();
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.page_number) qs.set("page_number", String(params.page_number));
  return _fetch(`/jwxt/training-plan?${qs.toString()}`, undefined, credential);
}

export function getAcademicCompletion(credential: string): Promise<AcademicCompletion> {
  return _fetch("/jwxt/academic-completion", undefined, credential);
}

export function getAcademicWarnings(credential: string): Promise<AcademicWarning[]> {
  return _fetch("/jwxt/academic-warnings", undefined, credential);
}

// ── Evaluation ──────────────────────────────────────────

export function getEvaluationTypes(credential: string, term?: string): Promise<EvaluationType[]> {
  const qs = new URLSearchParams();
  if (term) qs.set("term", term);
  return _fetch(`/jwxt/evaluation/types?${qs.toString()}`, undefined, credential);
}

export function getPendingEvaluations(
  credential: string,
  eval_type: string,
  term?: string,
): Promise<EvaluationTask[]> {
  const qs = new URLSearchParams();
  qs.set("eval_type", eval_type);
  if (term) qs.set("term", term);
  return _fetch(`/jwxt/evaluation/pending?${qs.toString()}`, undefined, credential);
}

export function getEvaluationDetail(
  credential: string,
  group_no: string,
  eval_type: string,
  sequence = 1,
): Promise<EvaluationDetail> {
  const qs = new URLSearchParams();
  qs.set("group_no", group_no);
  qs.set("eval_type", eval_type);
  qs.set("sequence", String(sequence));
  return _fetch(`/jwxt/evaluation/detail?${qs.toString()}`, undefined, credential);
}

export function calculateScore(
  credential: string,
  payload: CalculateScoreRequest,
): Promise<Record<string, unknown>> {
  return _fetch(
    "/jwxt/evaluation/calculate-score",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    credential,
  );
}

export function submitEvaluation(
  credential: string,
  payload: SubmitEvaluationRequest,
): Promise<{ detail: string }> {
  return _fetch(
    "/jwxt/evaluation/submit",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    credential,
  );
}
