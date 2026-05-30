/**
 * @fileoverview AcademicProvider interface and unified domain models.
 *
 * This module defines the contract that all academic data providers must
 * implement, along with the canonical data models shared across the
 * application. The goal is to decouple UI components from any particular
 * university backend so that the same views can work with multiple providers.
 */

/** Capability flags indicating which features a provider supports. */
export interface AcademicCapabilities {
  /** Supports querying grades / transcripts. */
  grades: boolean;
  /** Supports querying class schedule / timetable. */
  schedule: boolean;
  /** Supports querying exam arrangements. */
  exams: boolean;
  /** Supports querying GPA statistics. */
  gpa: boolean;
  /** Supports course evaluation (teaching evaluation). */
  evaluation: boolean;
  /** Supports querying training plan / curriculum. */
  trainingPlan: boolean;
  /** Supports querying student basic information. */
  studentInfo: boolean;
  /** Supports querying the current academic week number. */
  currentWeek: boolean;
}

/** Login credential supplied by the user. */
export interface Credential {
  /** Student ID or username. */
  username: string;
  /** Plain-text password (will be handled securely by the provider). */
  password: string;
  /** Optional extra fields required by specific providers (e.g. captcha). */
  metadata?: Record<string, unknown>;
}

/** Options for querying grades. */
export interface GradeQueryOptions {
  /** Academic semester identifier, e.g. "2024-2025-1". */
  semester?: string;
  /** Course type filter, e.g. "required", "elective". */
  courseType?: string;
}

/** Options for querying the class schedule. */
export interface ScheduleQueryOptions {
  /** Week number (1-based). */
  week: number;
  /** Academic semester identifier. */
  semester?: string;
}

/** Options for querying exam arrangements. */
export interface ExamQueryOptions {
  /** Academic semester identifier. */
  semester?: string;
}

/** Basic student profile information. */
export interface StudentInfo {
  /** Full name. */
  name: string;
  /** Pinyin of the name, if available. */
  namePinyin?: string;
  /** Student ID number. */
  studentId: string;
  /** Gender. */
  gender?: string;
  /** Nation / ethnicity. */
  nation?: string;
  /** Nationality. */
  nationality?: string;
  /** Department / college name. */
  department?: string;
  /** Major name. */
  major?: string;
  /** Class name. */
  className?: string;
  /** Grade level, e.g. "2022". */
  gradeLevel?: string;
  /** Enrollment date. */
  enrollmentDate?: string;
  /** Expected graduation date. */
  expectedGraduation?: string;
  /** Education level, e.g. "本科", "硕士". */
  educationLevel?: string;
  /** Campus name. */
  campus?: string;
  /** Student status, e.g. "在读". */
  studentStatus?: string;
  /** Discipline category. */
  discipline?: string;
  /** Study duration in years. */
  studyDuration?: string;
  /** Foreign language studied. */
  foreignLanguage?: string;
}

/** A single grade / course score record. */
export interface Grade {
  /** Course name. */
  courseName: string;
  /** Course code. */
  courseCode?: string;
  /** Class ID. */
  classId?: string;
  /** Raw score string, e.g. "92" or "优秀". */
  score: string;
  /** Grade level, e.g. "A", "优秀". */
  gradeLevel?: string;
  /** Grade point, e.g. "4.0". */
  gradePoint?: string;
  /** Course credit. */
  credit: string;
  /** Class hours. */
  hours?: string;
  /** Academic semester. */
  semester?: string;
  /** Course type, e.g. "必修", "选修". */
  courseType?: string;
  /** Course category. */
  courseCategory?: string;
  /** Exam type, e.g. "正常考试", "补考". */
  examType?: string;
  /** Study mode, e.g. "初修", "重修". */
  studyMode?: string;
  /** Whether this is a major course. */
  isMajor: boolean;
  /** Whether this is a retake. */
  isRetake?: boolean;
  /** Grade level type code. */
  gradeLevelType?: string;
  /** Department offering the course. */
  department?: string;
  /** Whether the score is a pass. */
  isPass: boolean;
  /** Whether the grade is valid (not cancelled, etc.). */
  isValid: boolean;
  /** Special reason for the grade, if any. */
  specialReason?: string;
  /** Whether this is a degree-required course. */
  isDegreeCourse: boolean;
  /** Project or experiment name, if applicable. */
  projectName?: string;
  /** Provider-specific extra data. */
  metadata?: Record<string, unknown>;
}

/** GPA and credit statistics. */
export interface GPAStats {
  /** Plan name, e.g. "主修". */
  planName?: string;
  /** Study type, e.g. "本科". */
  studyType?: string;
  /** Earned required credits. */
  requiredCreditEarned?: string;
  /** Earned elective credits. */
  electiveCreditEarned?: string;
  /** Earned degree credits. */
  degreeCreditEarned?: string;
  /** Failed required credits. */
  requiredCreditFailed?: string;
  /** Initial GPA (before any retakes). */
  gpaInitial?: string;
  /** Highest GPA achieved. */
  gpaHighest?: string;
  /** Highest required-course GPA. */
  requiredGpaHighest?: string;
  /** Initial degree-course GPA. */
  degreeGpaInitial?: string;
  /** Highest degree-course GPA. */
  degreeGpaHighest?: string;
  /** Weighted average score. */
  weightedAvg?: string;
  /** Arithmetic average score. */
  arithmeticAvg?: string;
  /** Degree-course weighted average. */
  degreeWeightedAvg?: string;
}

/** A single scheduled course session (one time slot). */
export interface Course {
  /** Course name. */
  name: string;
  /** Course code. */
  code?: string;
  /** Teacher name(s). */
  teacher?: string;
  /** Classroom / location. */
  classroom?: string;
  /** Day of week (1 = Monday, 7 = Sunday). */
  weekDay: number;
  /** Start section / period (1-based). */
  startSection: number;
  /** End section / period (inclusive). */
  endSection: number;
  /** Weeks during which this session occurs, e.g. "1-16" or "1,3,5...". */
  weeks?: string;
  /** Course credit. */
  credit?: string;
  /** Course type. */
  courseType?: string;
  /** Class ID. */
  classId?: string;
  /** Schedule ID from the backend. */
  scheduleId?: string;
  /** Raw provider-specific data. */
  raw?: Record<string, unknown>;
}

/** An exam arrangement entry. */
export interface Exam {
  /** Course or exam name. */
  name: string;
  /** Specific exam name, e.g. "期末考试". */
  examName?: string;
  /** Exam date string. */
  examDate?: string;
  /** Exam time range string. */
  examTime?: string;
  /** Exam location / room. */
  examLocation?: string;
  /** Seat number. */
  seatNumber?: string;
}

/** A teaching-evaluation task header. */
export interface EvaluationTask {
  /** Task ID. */
  wid: string;
  /** Evaluation form ID. */
  wjid?: string;
  /** Task name. */
  name?: string;
  /** Course name being evaluated. */
  courseName?: string;
  /** Teacher name being evaluated. */
  teacherName?: string;
  /** Teacher ID. */
  teacherId?: string;
  /** Academic term. */
  term?: string;
  /** Evaluation type code. */
  evalType?: string;
  /** Evaluation type display name. */
  evalTypeName?: string;
  /** Category code. */
  category?: string;
  /** Category display name. */
  categoryName?: string;
  /** Start time of the evaluation window. */
  startTime?: string;
  /** End time of the evaluation window. */
  endTime?: string;
  /** Sequence / order number. */
  sequence: number;
  /** Class name. */
  className?: string;
  /** Group number. */
  groupNo?: string;
}

/** A single option inside an evaluation question. */
export interface QuestionOption {
  /** Option ID. */
  wid: string;
  /** Option text. */
  text?: string;
  /** Absolute score value. */
  score: number;
  /** Score ratio (e.g. 1.0 for full score). */
  scoreRatio: number;
  /** Parent question ID. */
  questionId?: string;
}

/** A question inside an evaluation form. */
export interface Question {
  /** Question ID. */
  tmid: string;
  /** Evaluation form ID. */
  wjid?: string;
  /** Question text. */
  text?: string;
  /** Question type, e.g. "single", "multiple", "text". */
  questionType?: string;
  /** Maximum score for this question. */
  maxScore: number;
  /** Display order. */
  order: number;
  /** Available options (for choice questions). */
  options: QuestionOption[];
}

/** Detailed evaluation form definition. */
export interface EvaluationDetail {
  /** Evaluation form ID. */
  wjid?: string;
  /** Form name. */
  name?: string;
  /** Submission deadline. */
  deadline?: string;
  /** Questions in the form. */
  questions: Question[];
  /** Teachers being evaluated (provider-specific shape). */
  teachers?: Record<string, unknown>[];
}

/** A single answer to an evaluation question. */
export interface EvaluationAnswer {
  /** Question ID. */
  tmid: string;
  /** Question type. */
  questionType?: string;
  /** Selected option IDs (for choice questions). */
  optionIds?: string[];
  /** Free-text answer (for text questions). */
  text?: string;
}

/** A course entry in the training plan / curriculum. */
export interface TrainingPlan {
  /** Course name. */
  courseName: string;
  /** Course code. */
  courseCode?: string;
  /** Credit. */
  credit?: string;
  /** Course type. */
  courseType?: string;
  /** Whether the course is required. */
  required: boolean;
  /** Term / semester in which the course is scheduled. */
  term?: string;
  /** Course group / module name. */
  courseGroup?: string;
}

/** An academic warning / probation record. */
export interface AcademicWarning {
  /** Warning type, e.g. "学分不足". */
  warningType: string;
  /** Warning level, e.g. "黄色", "红色". */
  warningLevel?: string;
  /** Detailed description. */
  description?: string;
  /** Related term. */
  term?: string;
}

/** Academic completion / graduation audit summary. */
export interface AcademicCompletion {
  /** Plan name. */
  planName?: string;
  /** Total credits required. */
  totalRequired?: string;
  /** Credits completed. */
  completed?: string;
  /** Elective credits completed. */
  elective?: string;
  /** Whether the student has passed the audit. */
  passed: boolean;
}

/**
 * Abstract contract for an academic data provider.
 *
 * Implementations hide the details of a specific university backend
 * (e.g. Yanshan University JWXT) and expose a uniform API for the UI layer.
 */
export interface AcademicProvider {
  /** Unique provider identifier, e.g. "ysu-jwxt". */
  readonly id: string;

  /** Human-readable provider name. */
  readonly name: string;

  /** Feature flags indicating what this provider supports. */
  readonly capabilities: AcademicCapabilities;

  /** Authenticate with the backend. */
  login(credential: Credential): Promise<void>;

  /** Clear local session / tokens. */
  logout(): Promise<void>;

  /** Whether the user is currently authenticated. */
  isAuthenticated(): boolean;

  /** Fetch basic student profile. */
  getStudentInfo(): Promise<StudentInfo>;

  /** Fetch grade records. */
  getGrades(options?: GradeQueryOptions): Promise<Grade[]>;

  /** Fetch GPA statistics. */
  getGPAStats(): Promise<GPAStats>;

  /** Fetch class schedule for a specific week. */
  getSchedule(options: ScheduleQueryOptions): Promise<Course[]>;

  /** Fetch the current academic week number. */
  getCurrentWeek(): Promise<number>;

  /** Fetch exam arrangements. */
  getExams(options?: ExamQueryOptions): Promise<Exam[]>;

  /** Fetch pending teaching-evaluation tasks. */
  getEvaluationTasks(): Promise<EvaluationTask[]>;

  /** Fetch the full evaluation form for a task. */
  getEvaluationDetail(taskId: string): Promise<EvaluationDetail>;

  /** Submit evaluation answers for a task. */
  submitEvaluation(taskId: string, answers: EvaluationAnswer[]): Promise<void>;

  /** Fetch the training plan / curriculum. */
  getTrainingPlan(): Promise<TrainingPlan[]>;

  /** Fetch academic completion / graduation audit summary. */
  getAcademicCompletion(): Promise<AcademicCompletion>;

  /** Fetch academic warnings, if any. */
  getAcademicWarnings(): Promise<AcademicWarning[]>;
}
