/**
 * YSUProvider — AcademicProvider implementation for Yanshan University.
 *
 * Wraps CAS authentication (lib/cas.ts) and EMAP data fetching (lib/jwxt.ts)
 * behind the unified AcademicProvider interface.
 */
import {
  ProviderError,
  ProviderErrorCode,
} from "../errors";
import type {
  AcademicProvider,
  AcademicCapabilities,
  Credential,
  StudentInfo,
  Grade,
  GPAStats,
  Course,
  ScheduleQueryOptions,
  GradeQueryOptions,
  ExamQueryOptions,
  Exam,
  EvaluationTask,
  EvaluationDetail,
  EvaluationAnswer,
  TrainingPlan,
  AcademicCompletion,
  AcademicWarning,
} from "../types";
import { ALL_CAPABILITIES } from "../capabilities";
import {
  prepareLogin,
  checkCaptchaNeeded,
  loginStep1,
  requestMFACode,
  submitMFACode,
  isAuthenticated,
  saveCredential,
  type LoginStep1Result,
  type MFAChallenge,
} from "./cas-auth";
import {
  queryStudentInfo as _queryStudentInfo,
  queryGrades as _queryGrades,
  queryGpaStats as _queryGpaStats,
  querySchedule as _querySchedule,
  queryExperimentalSchedule as _queryExperimentalSchedule,
  queryCurrentWeek as _queryCurrentWeek,
  queryExams as _queryExams,
  queryTrainingPlan as _queryTrainingPlan,
  queryAcademicCompletion as _queryAcademicCompletion,
  queryAcademicWarnings as _queryAcademicWarnings,
  queryEvaluationTypes as _queryEvaluationTypes,
  queryPendingEvaluations as _queryPendingEvaluations,
  queryEvaluationDetail as _queryEvaluationDetail,
  submitEvaluation as _submitEvaluation,
} from "./emap-fetcher";
import { useAuthStore } from "../../lib/auth-store";
import { resetSDK } from "../../lib/sdk";

export class YSUProvider implements AcademicProvider {
  readonly id = "ysu";
  readonly name = "燕山大学";
  readonly capabilities: AcademicCapabilities = ALL_CAPABILITIES;

  // ─── Auth ───────────────────────────────────────────────────────────────

  async login(credential: Credential): Promise<void> {
    await prepareLogin();

    const needsCaptcha = await checkCaptchaNeeded(credential.username);
    if (needsCaptcha && !credential.metadata?.captcha) {
      throw new ProviderError(
        ProviderErrorCode.AUTH_CAPTCHA_REQUIRED,
        "Captcha required",
      );
    }

    const captcha =
      typeof credential.metadata?.captcha === "string"
        ? credential.metadata.captcha
        : undefined;

    const step1: LoginStep1Result = await loginStep1({
      username: credential.username,
      password: credential.password,
      captcha,
    });

    if (step1.authenticated) {
      if (step1.credential) {
        saveCredential(step1.credential, credential.username);
      }
      return;
    }

    if (step1.needsMfa) {
      // MFA is required but no code provided — caller must handle MFA flow
      // by calling requestMFACode + submitMFACode separately, then retry login
      // with the MFA code in metadata, or the UI layer handles it.
      // For the provider interface, we throw MFA_REQUIRED.
      throw new ProviderError(
        ProviderErrorCode.AUTH_MFA_REQUIRED,
        "Multi-factor authentication required",
      );
    }

    throw new ProviderError(
      ProviderErrorCode.AUTH_INVALID_CREDENTIAL,
      "Login failed",
    );
  }

  async logout(): Promise<void> {
    resetSDK();
  }

  isAuthenticated(): boolean {
    // lib/cas.ts isAuthenticated is async, but AcademicProvider expects sync.
    // We check the auth-store state which is the source of truth for UI.
    return useAuthStore.getState().isAuthenticated;
  }

  // ─── Student Info ───────────────────────────────────────────────────────

  async getStudentInfo(): Promise<StudentInfo> {
    const info = await _queryStudentInfo();
    return {
      name: info.name ?? "",
      namePinyin: info.namePinyin ?? undefined,
      studentId: info.studentId ?? "",
      gender: info.gender ?? undefined,
      nation: info.nation ?? undefined,
      nationality: info.nationality ?? undefined,
      department: info.department ?? undefined,
      major: info.major ?? undefined,
      className: info.className ?? undefined,
      gradeLevel: info.gradeLevel ?? undefined,
      enrollmentDate: info.enrollmentDate ?? undefined,
      expectedGraduation: info.expectedGraduation ?? undefined,
      educationLevel: info.educationLevel ?? undefined,
      campus: info.campus ?? undefined,
      studentStatus: info.studentStatus ?? undefined,
      discipline: info.discipline ?? undefined,
      studyDuration: info.studyDuration ?? undefined,
      foreignLanguage: info.foreignLanguage ?? undefined,
    };
  }

  // ─── Grades ─────────────────────────────────────────────────────────────

  async getGrades(options?: GradeQueryOptions): Promise<Grade[]> {
    const rows = await _queryGrades({
      term: options?.semester,
      courseName: options?.courseType,
    });
    return rows.map((r) => ({
      courseName: r.courseName ?? "",
      courseCode: r.courseCode ?? undefined,
      classId: r.classId ?? undefined,
      score: r.score ?? "",
      gradeLevel: r.gradeLevel ?? undefined,
      gradePoint: r.gradePoint ?? undefined,
      credit: r.credit ?? "",
      hours: r.hours ?? undefined,
      semester: r.term ?? undefined,
      courseType: r.courseType ?? undefined,
      courseCategory: r.courseCategory ?? undefined,
      examType: r.examType ?? undefined,
      studyMode: r.studyMode ?? undefined,
      isMajor: r.isMajor ?? false,
      isRetake: r.isRetake ? true : undefined,
      gradeLevelType: r.gradeLevelType ?? undefined,
      department: r.department ?? undefined,
      isPass: r.isPass ?? false,
      isValid: r.isValid ?? false,
      specialReason: r.specialReason ?? undefined,
      isDegreeCourse: r.isDegreeCourse ?? false,
      projectName: r.projectName ?? undefined,
      metadata: r.raw ?? undefined,
    }));
  }

  async getGPAStats(): Promise<GPAStats> {
    const stats = await _queryGpaStats();
    return {
      planName: stats.planName ?? undefined,
      studyType: stats.studyType ?? undefined,
      requiredCreditEarned: stats.requiredCreditEarned ?? undefined,
      electiveCreditEarned: stats.electiveCreditEarned ?? undefined,
      degreeCreditEarned: stats.degreeCreditEarned ?? undefined,
      requiredCreditFailed: stats.requiredCreditFailed ?? undefined,
      gpaInitial: stats.gpaInitial ?? undefined,
      gpaHighest: stats.gpaHighest ?? undefined,
      requiredGpaHighest: stats.requiredGpaHighest ?? undefined,
      degreeGpaInitial: stats.degreeGpaInitial ?? undefined,
      degreeGpaHighest: stats.degreeGpaHighest ?? undefined,
      weightedAvg: stats.weightedAvg ?? undefined,
      arithmeticAvg: stats.arithmeticAvg ?? undefined,
      degreeWeightedAvg: stats.degreeWeightedAvg ?? undefined,
    };
  }

  // ─── Schedule ───────────────────────────────────────────────────────────

  async getSchedule(options: ScheduleQueryOptions): Promise<Course[]> {
    const rows = await _querySchedule({ term: options.semester });
    return rows.map((r) => ({
      name: r.name ?? "",
      code: r.code ?? undefined,
      teacher: r.teacher ?? undefined,
      classroom: r.classroom ?? undefined,
      weekDay: r.weekDay ?? 0,
      startSection: r.startSection ?? 0,
      endSection: r.endSection ?? 0,
      weeks: r.weeks ?? undefined,
      credit: r.credit ?? undefined,
      courseType: r.courseType ?? undefined,
      classId: r.classId ?? undefined,
      scheduleId: r.scheduleId ?? undefined,
      raw: r.raw ?? undefined,
    }));
  }

  async getCurrentWeek(): Promise<number> {
    const week = await _queryCurrentWeek();
    return week.week ?? 0;
  }

  // ─── Exams ──────────────────────────────────────────────────────────────

  async getExams(options?: ExamQueryOptions): Promise<Exam[]> {
    const rows = await _queryExams({ term: options?.semester });
    return rows.map((r) => ({
      name: r.name ?? "",
      examName: r.examName ?? undefined,
      examDate: r.examDate ?? undefined,
      examTime: r.examTime ?? undefined,
      examLocation: r.examLocation ?? undefined,
      seatNumber: r.seatNumber ?? undefined,
    }));
  }

  // ─── Evaluation ─────────────────────────────────────────────────────────

  async getEvaluationTasks(): Promise<EvaluationTask[]> {
    const types = await _queryEvaluationTypes();
    const tasks: EvaluationTask[] = [];
    for (const t of types) {
      const pending = await _queryPendingEvaluations(t.code, { term: undefined });
      tasks.push(
        ...pending.map((p) => ({
          wid: p.wid ?? "",
          wjid: p.wjid ?? undefined,
          name: p.name ?? undefined,
          courseName: p.courseName ?? undefined,
          teacherName: p.teacherName ?? undefined,
          teacherId: p.teacherId ?? undefined,
          term: p.term ?? undefined,
          evalType: p.evalType ?? undefined,
          evalTypeName: p.evalTypeName ?? undefined,
          category: p.category ?? undefined,
          categoryName: p.categoryName ?? undefined,
          startTime: p.startTime ?? undefined,
          endTime: p.endTime ?? undefined,
          sequence: p.sequence ?? 0,
          className: p.className ?? undefined,
          groupNo: p.groupNo ?? undefined,
        })),
      );
    }
    return tasks;
  }

  async getEvaluationDetail(taskId: string): Promise<EvaluationDetail> {
    // taskId is expected to be in format "groupNo|evalType|sequence"
    const parts = taskId.split("|");
    const groupNo = parts[0] ?? taskId;
    const evalType = parts[1] ?? "";
    const sequence = parts[2] ? parseInt(parts[2], 10) : 1;

    const d = await _queryEvaluationDetail(groupNo, evalType, {
      sequence: Number.isNaN(sequence) ? 1 : sequence,
    });
    return {
      wjid: d.wjid ?? undefined,
      name: d.name ?? undefined,
      deadline: d.deadline ?? undefined,
      questions:
        d.questions?.map((q) => ({
          tmid: q.tmid ?? "",
          wjid: q.wjid ?? undefined,
          text: q.text ?? undefined,
          questionType: q.questionType ?? undefined,
          maxScore: q.maxScore ?? 0,
          order: q.order ?? 0,
          options:
            q.options?.map((o) => ({
              wid: o.wid ?? "",
              text: o.text ?? undefined,
              score: o.score ?? 0,
              scoreRatio: o.scoreRatio ?? 0,
              questionId: o.questionId ?? undefined,
            })) ?? [],
        })) ?? [],
      teachers: d.teachers as Record<string, unknown>[] | undefined,
    };
  }

  async submitEvaluation(
    taskId: string,
    answers: EvaluationAnswer[],
  ): Promise<void> {
    const parts = taskId.split("|");
    const groupNo = parts[0] ?? taskId;
    const evalType = parts[1] ?? "";

    // We need wjid from the evaluation detail
    const d = await _queryEvaluationDetail(groupNo, evalType);
    const wjid = d.wjid ?? "";

    await _submitEvaluation(
      groupNo,
      wjid,
      evalType,
      answers.map((a) => ({
        tmid: a.tmid,
        questionType: a.questionType ?? "",
        optionIds: a.optionIds ?? [],
        text: a.text ?? "",
      })),
    );
  }

  // ─── Training Plan ──────────────────────────────────────────────────────

  async getTrainingPlan(): Promise<TrainingPlan[]> {
    const rows = await _queryTrainingPlan();
    return rows.map((r) => ({
      courseName: r.courseName ?? "",
      courseCode: r.courseCode ?? undefined,
      credit: r.credit ?? undefined,
      courseType: r.courseType ?? undefined,
      required: r.required ?? false,
      term: r.term ?? undefined,
      courseGroup: r.courseGroup ?? undefined,
    }));
  }

  // ─── Academic ───────────────────────────────────────────────────────────

  async getAcademicCompletion(): Promise<AcademicCompletion> {
    const c = await _queryAcademicCompletion();
    return {
      planName: c.planName ?? undefined,
      totalRequired: c.totalRequired ?? undefined,
      completed: c.completed ?? undefined,
      elective: c.elective ?? undefined,
      passed: c.passed ?? false,
    };
  }

  async getAcademicWarnings(): Promise<AcademicWarning[]> {
    const rows = await _queryAcademicWarnings();
    return rows.map((r) => ({
      warningType: r.warningType ?? "",
      warningLevel: r.warningLevel ?? undefined,
      description: r.description ?? undefined,
      term: r.term ?? undefined,
    }));
  }
}
