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
  GradeDistribution,
  GradeRanking,
  GradeStatistics,
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
import { useAuthStore } from "./auth-store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:11920";

// 冷启动单飞:第一批 /jwxt/* 请求会触发服务端的 cas.authorize() 拿 ST,
// 不加约束时多个并发请求会各自打一次 CAS 网关。让首个请求做 bootstrapper,
// 其它并发请求等它回填 jwxtSession 后再发,稳态下 1 次 CAS 调用就够服务整个 dashboard。
let inflightBootstrap: Promise<void> | null = null;

async function _fetch<T>(
  path: string,
  options?: RequestInit,
  credential?: string | null,
): Promise<T> {
  const pathNeedsJwxt = path.startsWith("/jwxt/") && !!credential;

  if (
    pathNeedsJwxt &&
    !useAuthStore.getState().jwxtSession &&
    inflightBootstrap
  ) {
    await inflightBootstrap;
  }

  const doFetch = async (): Promise<T> => {
    const auth = useAuthStore.getState();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    };
    if (credential) {
      headers["X-CAS-Credential"] = credential;
    }
    // 业务路由从 store 回传 JWXT session,允许服务端跳过 CAS authorize。
    // 登录类路由不读这个 header,服务端不会拒绝多余的 header,直接忽略即可。
    if (auth.jwxtSession) {
      headers["X-JWXT-Session"] = auth.jwxtSession;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    // 不论成功失败,先把可能旋转过的 CAS / JWXT 凭据更新到 store。
    // 注:CORS 必须在 expose_headers 中声明这两个 header,否则浏览器 JS 读不到。
    const rotatedCas = res.headers.get("X-CAS-Credential");
    if (rotatedCas && rotatedCas !== credential) {
      auth.setCredential(rotatedCas, auth.username ?? undefined);
    }
    const rotatedJwxt = res.headers.get("X-JWXT-Session");
    if (rotatedJwxt && rotatedJwxt !== auth.jwxtSession) {
      auth.setJwxtSession(rotatedJwxt);
    }

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
  };

  if (
    pathNeedsJwxt &&
    !useAuthStore.getState().jwxtSession &&
    !inflightBootstrap
  ) {
    const p = doFetch();
    // bootstrapper 的 promise 总会 resolve,失败也让 siblings 醒过来自行重试;
    // finally 里清空 inflight,保证下一波冷启动有人能再次接棒。
    inflightBootstrap = p
      .then(
        () => {},
        () => {},
      )
      .finally(() => {
        inflightBootstrap = null;
      });
    return p;
  }

  return doFetch();
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

export function getGradeStatistics(
  credential: string,
  params: { class_id?: string; course_code?: string; term?: string },
): Promise<GradeStatistics> {
  const qs = new URLSearchParams();
  if (params.class_id) qs.set("class_id", params.class_id);
  if (params.course_code) qs.set("course_code", params.course_code);
  if (params.term) qs.set("term", params.term);
  return _fetch(`/jwxt/grades/statistics?${qs.toString()}`, undefined, credential);
}

export function getGradeDistribution(
  credential: string,
  params: { class_id?: string; course_code?: string; term?: string },
): Promise<GradeDistribution[]> {
  const qs = new URLSearchParams();
  if (params.class_id) qs.set("class_id", params.class_id);
  if (params.course_code) qs.set("course_code", params.course_code);
  if (params.term) qs.set("term", params.term);
  return _fetch(`/jwxt/grades/distribution?${qs.toString()}`, undefined, credential);
}

export function getGradeRanking(
  credential: string,
  params: { class_id?: string; course_code?: string; term?: string; student_id?: string },
): Promise<GradeRanking> {
  const qs = new URLSearchParams();
  if (params.class_id) qs.set("class_id", params.class_id);
  if (params.course_code) qs.set("course_code", params.course_code);
  if (params.term) qs.set("term", params.term);
  if (params.student_id) qs.set("student_id", params.student_id);
  return _fetch(`/jwxt/grades/ranking?${qs.toString()}`, undefined, credential);
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
