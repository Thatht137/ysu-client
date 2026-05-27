/**
 * 成绩/考试发布通知模块
 *
 * 前台轮询：App 活跃时定时检查 + 回到前台时立即检查。
 * 后台轮询由原生 Android 插件实现（ysu-notify-plugin），含通知权限管理。
 *
 * In-app 通知使用 Toast，后台通知由原生插件用 NotificationManager 发送。
 */
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { toast } from "sonner";
import { getGrades, getExams } from "./api";
import { useAuthStore } from "./auth-store";
import { useSettingsStore } from "./settings-store";
import { isCapacitor } from "./platform";
import { getText } from "./i18n/get-text";
import { NotifyPlugin } from "./notify-plugin";
import { getJar as getCasJar } from "./cas";
import { loadCASTGC } from "./secure-storage";
import type { Grade, Exam } from "./types";
import { buildNativeServerConfig } from "./notify-config";
import type { Course, CurrentWeek, ClassPeriod } from "./types";

let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateHandle: PluginListenerHandle | null = null;
let settingsUnsub: (() => void) | null = null;
let checking = false;

const recentNotifications = new Set<string>();
const RECENT_WINDOW_MS = 60 * 60 * 1000;

function shouldNotify(type: "grade" | "exam", key: string): boolean {
  const fullKey = `${type}:${key}:${Math.floor(Date.now() / RECENT_WINDOW_MS)}`;
  if (recentNotifications.has(fullKey)) return false;
  recentNotifications.add(fullKey);
  if (recentNotifications.size > 100) {
    const cutoff = Math.floor(Date.now() / RECENT_WINDOW_MS) - 2;
    for (const k of recentNotifications) {
      const parts = k.split(":");
      if (parts.length >= 3 && parseInt(parts[2]!, 10) < cutoff) {
        recentNotifications.delete(k);
      }
    }
  }
  return true;
}

// ─── Diff Logic ─────────────────────────────────────────────────────────── //

function gradeKey(g: Grade): string {
  return `${g.course_code || g.course_name}|${g.term || ""}`;
}

function examKey(e: Exam): string {
  return `${e.name}|${e.exam_date ?? ""}`;
}

export function diffGrades(oldList: Grade[], newList: Grade[]): Grade[] {
  const oldKeys = new Set(oldList.map(gradeKey));
  return newList.filter((g) => !oldKeys.has(gradeKey(g)));
}

export function diffExams(oldList: Exam[], newList: Exam[]): Exam[] {
  const oldMap = new Map(oldList.map((e) => [examKey(e), e]));
  const added: Exam[] = [];
  for (const e of newList) {
    const key = examKey(e);
    const old = oldMap.get(key);
    if (!old) {
      added.push(e);
    } else if (
      old.exam_time !== e.exam_time ||
      old.exam_location !== e.exam_location ||
      old.seat_number !== e.seat_number
    ) {
      added.push(e);
    }
  }
  return added;
}

// ─── Core Check ─────────────────────────────────────────────────────────── //

export async function checkAndNotify(): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    await _checkAndNotify();
  } finally {
    checking = false;
  }
}

async function _checkAndNotify(): Promise<void> {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) return;

  const { notifyGrades, notifyExams } = useSettingsStore.getState();
  if (!notifyGrades && !notifyExams) return;

  const credential = useAuthStore.getState().credential;
  if (!credential) return;

  // Fetch and diff grades
  if (notifyGrades) {
    try {
      const newGrades = await getGrades(credential);
      const cachedResult = await NotifyPlugin.getCachedGrades();
      const cachedJson = (cachedResult as { gradesJson?: string }).gradesJson;
      const cached: Grade[] = cachedJson ? JSON.parse(cachedJson) : [];
      if (cached.length > 0) {
        const added = diffGrades(cached, newGrades);
        if (added.length > 0) {
          for (const g of added) {
            if (shouldNotify("grade", gradeKey(g))) {
              toast(getText("settings.notifyNewGrade"), {
                description: getText("settings.notifyNewGradeBody").replace(
                  "{course}",
                  g.course_name,
                ),
              });
            }
          }
        }
      }
      await NotifyPlugin.setCachedGrades({ gradesJson: JSON.stringify(newGrades) });
    } catch {
      // silently ignore fetch errors during background check
    }
  }

  // Fetch and diff exams
  if (notifyExams) {
    try {
      const newExams = await getExams(credential);
      const cachedResult = await NotifyPlugin.getCachedExams();
      const cachedJson = (cachedResult as { examsJson?: string }).examsJson;
      const cached: Exam[] = cachedJson ? JSON.parse(cachedJson) : [];
      if (cached.length > 0) {
        const changed = diffExams(cached, newExams);
        if (changed.length > 0) {
          for (const e of changed) {
            if (shouldNotify("exam", examKey(e))) {
              toast(getText("settings.notifyNewExam"), {
                description: getText("settings.notifyNewExamBody").replace(
                  "{exam}",
                  e.name,
                ),
              });
            }
          }
        }
      }
      await NotifyPlugin.setCachedExams({ examsJson: JSON.stringify(newExams) });
    } catch {
      // silently ignore
    }
  }
}

// ─── Foreground Polling ─────────────────────────────────────────────────── //

function getIntervalMs(): number {
  const { notifyCheckInterval } = useSettingsStore.getState();
  return Math.max(5, notifyCheckInterval) * 60 * 1000;
}

function startInterval(): void {
  stopInterval();
  const ms = getIntervalMs();
  pollTimer = setInterval(() => {
    checkAndNotify();
  }, ms);
}

function stopInterval(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function handleAppStateChange(): Promise<void> {
  removeAppStateListener();
  const handle = await App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      startInterval();
      checkAndNotify();
      if (isCapacitor()) {
        NotifyPlugin.pausePolling().catch(() => {});
      }
    } else {
      stopInterval();
      if (isCapacitor()) {
        NotifyPlugin.resumePolling().catch(() => {});
      }
    }
  });
  appStateHandle = handle;
}

function removeAppStateListener(): void {
  if (appStateHandle) {
    appStateHandle.remove();
    appStateHandle = null;
  }
}

function unsubscribeSettings(): void {
  if (settingsUnsub) {
    settingsUnsub();
    settingsUnsub = null;
  }
}

export async function syncServerConfigToNative(): Promise<void> {
  if (!isCapacitor()) return;
  try {
    const config = buildNativeServerConfig();
    await NotifyPlugin.setServerConfig({ configJson: JSON.stringify(config) });
  } catch (e) {
    console.warn("Failed to sync server config to native", e);
  }
}

/**
 * 启动通知轮询。在 SDK 初始化完成后调用。
 * 如果 notifyEnabled 为 false，不会启动任何轮询。
 */
export async function startNotifyIfNeeded(): Promise<void> {
  if (!isCapacitor()) return;

  const { notifyEnabled } = useSettingsStore.getState();
  if (!notifyEnabled) return;

  await syncServerConfigToNative();

  // Listen for foreground transitions
  await handleAppStateChange();

  // Start periodic polling (foreground)
  startInterval();

  // Start native background polling
  startNativePolling().catch(() => {});

  // Subscribe to settings changes
  settingsUnsub = useSettingsStore.subscribe((state, prevState) => {
    if (state.notifyEnabled !== prevState.notifyEnabled) {
      if (state.notifyEnabled) {
        startInterval();
        handleAppStateChange();
        startNativePolling().catch(() => {});
      } else {
        stopInterval();
        removeAppStateListener();
        stopNativePolling().catch(() => {});
      }
    }
    if (state.notifyCheckInterval !== prevState.notifyCheckInterval) {
      if (state.notifyEnabled) {
        startInterval();
        // 原生轮询间隔变更：重启原生轮询
        startNativePolling().catch(() => {});
      }
    }
    if (state.notifyGrades !== prevState.notifyGrades || state.notifyExams !== prevState.notifyExams) {
      if (state.notifyEnabled) {
        startNativePolling().catch(() => {});
      }
    }
  });

  // Initial check after a short delay (don't block startup)
  setTimeout(() => {
    checkAndNotify();
  }, 5000);
}

/**
 * 停止通知轮询。登出时调用。
 */
export function stopNotify(): void {
  stopInterval();
  removeAppStateListener();
  unsubscribeSettings();
  // 同时停止原生后台轮询
  if (isCapacitor()) {
    NotifyPlugin.stopPolling().catch(() => {});
    NotifyPlugin.clearCastgc().catch(() => {});
    NotifyPlugin.cancelClassAlarms().catch(() => {});
  }
}

// ─── Native Plugin Integration ────────────────────────────────────────────

/**
 * 将 CASTGC 同步到原生插件。在 SDK 初始化完成后调用。
 *
 * 优先从 secure storage 读取（saveCASTGC 时检查了非空），
 * fallback 到 CapacitorHttp cookie store 和 JS cookie jar。
 */
export async function syncCastgcToNative(): Promise<void> {
  if (!isCapacitor()) return;

  let castgc: string | undefined;

  // 1. 优先从 secure storage 读取（最可靠，保存时已校验非空）
  try {
    const stored = await loadCASTGC();
    if (stored) castgc = stored;
  } catch {
    // ignore
  }

  // 2. fallback：从 CapacitorHttp cookie store 读取
  if (!castgc) {
    try {
      const { CapacitorCookies } = await import("@capacitor/core");
      const cookies = await CapacitorCookies.getCookies({
        url: "https://cer.ysu.edu.cn/authserver",
      });
      castgc = cookies?.CASTGC;
    } catch {
      // ignore
    }
  }

  // 3. fallback：从 JS cookie jar 读取
  if (!castgc) {
    try {
      const allCookies = await getCasJar().getAllCookies();
      const entry = allCookies.find((c) => c.name === "CASTGC");
      if (entry?.value) {
        castgc = entry.value;
      }
    } catch {
      // ignore
    }
  }

  if (castgc) {
    await NotifyPlugin.setCastgc({ castgc });
  }
}

/**
 * 启动原生后台轮询。在通知设置启用时调用。
 */
export async function startNativePolling(): Promise<void> {
  if (!isCapacitor()) return;

  const { notifyCheckInterval, notifyGrades, notifyExams } = useSettingsStore.getState();

  // 检查通知权限
  const perm = await NotifyPlugin.checkPermissions();
  if (!perm.granted) {
    await NotifyPlugin.requestPermissions();
  }

  // 同步 CASTGC
  await syncCastgcToNative();

  // 启动轮询
  await NotifyPlugin.startPolling({
    intervalMinutes: notifyCheckInterval,
    checkGrades: notifyGrades,
    checkExams: notifyExams,
  });
}

/**
 * 停止原生后台轮询。
 */
export async function stopNativePolling(): Promise<void> {
  if (!isCapacitor()) return;
  await NotifyPlugin.stopPolling();
}

// ─── Class Alarm ────────────────────────────────────────────────────────────

export interface ClassAlarmConfig {
  alarmId: string;
  alarmTime: number;
  courseName: string;
  classroom: string;
  startTime: string;
  remindMinutes: number;
}

function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length < 2) return 0;
  return parseInt(parts[0]!, 10) * 60 + parseInt(parts[1]!, 10);
}

export function computeClassAlarms(
  courses: Course[],
  currentWeek: CurrentWeek | null,
  periods: ClassPeriod[],
  remindMinutes: number = 15,
): ClassAlarmConfig[] {
  const alarms: ClassAlarmConfig[] = [];
  const now = new Date();
  const periodMap = new Map(periods.map((p) => [p.section, p]));
  const todayWeekday = now.getDay() === 0 ? 7 : now.getDay();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetWeekday = ((todayWeekday - 1 + dayOffset) % 7) + 1;
    const dayCourses = courses.filter((c) => c.week_day === targetWeekday);

    for (const course of dayCourses) {
      const startPeriod = periodMap.get(course.start_section);
      if (!startPeriod?.start_time) continue;

      const startMinutes = parseTimeToMinutes(startPeriod.start_time);
      const alarmMinutes = startMinutes - remindMinutes;
      if (alarmMinutes < 0) continue;

      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      targetDate.setHours(Math.floor(alarmMinutes / 60), alarmMinutes % 60, 0, 0);

      if (targetDate.getTime() <= now.getTime()) continue;

      const alarmId = `${course.name}|${targetDate.toISOString().split("T")[0]}|${course.start_section}`;
      alarms.push({
        alarmId,
        alarmTime: targetDate.getTime(),
        courseName: course.name,
        classroom: course.classroom || "",
        startTime: startPeriod.start_time,
        remindMinutes,
      });
    }
  }

  return alarms;
}

export async function syncClassAlarmsToNative(
  courses: Course[],
  currentWeek: CurrentWeek | null,
  periods: ClassPeriod[],
): Promise<void> {
  if (!isCapacitor()) return;

  const { classReminderEnabled, classReminderMinutes } = useSettingsStore.getState();
  if (!classReminderEnabled) {
    await NotifyPlugin.cancelClassAlarms().catch(() => {});
    return;
  }

  const alarms = computeClassAlarms(courses, currentWeek, periods, classReminderMinutes);
  await NotifyPlugin.cancelClassAlarms().catch(() => {});
  if (alarms.length > 0) {
    await NotifyPlugin.scheduleClassAlarms({ alarmsJson: JSON.stringify(alarms) });
  }
}
