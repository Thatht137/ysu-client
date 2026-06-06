/**
 * 成绩/考试发布通知模块
 *
 * 通知由原生 Android WorkManager 后台轮询驱动（NotifyWorker），
 * 使用 CASTGC 建立 JWXT 会话，拉取成绩/考试后 diff 并发送系统通知。
 *
 * 上课提醒由 AlarmManager 在指定时间触发 ClassAlarmReceiver。
 */
import { useSettingsStore } from "./settings-store";
import { isCapacitor } from "./platform";
import { NotifyPlugin } from "./notify-plugin";
import { getJar as getCasJar } from "./cas";
import { loadCASTGC } from "./secure-storage";
import { buildNativeServerConfig } from "./notify-config";
import type { Course, CurrentWeek, ClassPeriod } from "./types";
import type {
  Course as ProviderCourse,
  CurrentWeek as ProviderCurrentWeek,
  ClassPeriod as ProviderClassPeriod,
} from "@/providers/types";

// ─── Config Sync ────────────────────────────────────────────────────────── //

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
 * 将 CASTGC 同步到原生插件。
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

// ─── Native Polling Control ─────────────────────────────────────────────── //

/**
 * 确保通知轮询在调度中。冷启动时由 NotifyProvider 调用，不主动触发立即检查。
 */
export async function startNotifyIfNeeded(): Promise<void> {
  if (!isCapacitor()) return;

  const { notifyEnabled } = useSettingsStore.getState();
  if (!notifyEnabled) return;

  await syncServerConfigToNative();
  await startNativePolling();
}

/**
 * 立即触发一次通知检查。用户手动开启通知时调用。
 */
export async function triggerNotifyCheck(): Promise<void> {
  if (!isCapacitor()) return;
  await NotifyPlugin.executeOnce().catch(() => {});
}

/**
 * 启动原生后台轮询。在通知设置启用时调用。
 */
export async function startNativePolling(): Promise<void> {
  if (!isCapacitor()) return;

  const { notifyCheckInterval, notifyGrades, notifyExams, notifyNetworkError } = useSettingsStore.getState();

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
    notifyNetworkError,
  });
}

/**
 * 停止原生后台轮询。
 */
export async function stopNativePolling(): Promise<void> {
  if (!isCapacitor()) return;
  await NotifyPlugin.stopPolling();
}

/**
 * 停止所有通知服务。登出时调用。
 */
export function stopNotify(): void {
  if (isCapacitor()) {
    NotifyPlugin.stopPolling().catch(() => {});
    NotifyPlugin.clearCastgc().catch(() => {});
    NotifyPlugin.cancelClassAlarms().catch(() => {});
  }
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

type AlarmCourse = Course | ProviderCourse;
type AlarmCurrentWeek = CurrentWeek | ProviderCurrentWeek;
type AlarmClassPeriod = ClassPeriod | ProviderClassPeriod;

function courseWeekDay(course: AlarmCourse): number {
  return (course as Course).week_day ?? (course as ProviderCourse).weekDay;
}

function courseStartSection(course: AlarmCourse): number {
  return (course as Course).start_section ?? (course as ProviderCourse).startSection;
}

function periodStartTime(period: AlarmClassPeriod): string | undefined {
  return (period as ClassPeriod).start_time ?? (period as ProviderClassPeriod).startTime;
}

function isCourseActiveInWeek(course: AlarmCourse, week: number): boolean {
  const weeksStr = course.weeks;
  if (!weeksStr) return true;
  const weeks = new Set<number>();
  for (const part of weeksStr.replace(/[周第\s]/g, "").split(/[,，]/)) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((s) => parseInt(s, 10));
      if (!isNaN(start) && !isNaN(end)) for (let w = start; w <= end; w++) weeks.add(w);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n)) weeks.add(n);
    }
  }
  return weeks.size === 0 || weeks.has(week);
}

export function computeClassAlarms(
  courses: AlarmCourse[],
  currentWeek: AlarmCurrentWeek | null,
  periods: AlarmClassPeriod[],
  remindMinutes: number = 15,
  days: number = 7,
): ClassAlarmConfig[] {
  const alarms: ClassAlarmConfig[] = [];
  const now = new Date();
  const periodMap = new Map(periods.map((p) => [p.section, p]));
  const todayWeekday = now.getDay() === 0 ? 7 : now.getDay();
  const baseWeek = currentWeek?.week ?? 1;

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const targetWeekday = ((todayWeekday - 1 + dayOffset) % 7) + 1;
    const weekOverflow = Math.floor((todayWeekday - 1 + dayOffset) / 7);
    const targetWeek = baseWeek + weekOverflow;
    const dayCourses = courses.filter(
      (c) => courseWeekDay(c) === targetWeekday && isCourseActiveInWeek(c, targetWeek),
    );

    for (const course of dayCourses) {
      const startSection = courseStartSection(course);
      const startPeriod = periodMap.get(startSection);
      const startTime = startPeriod ? periodStartTime(startPeriod) : undefined;
      if (!startTime) continue;

      const startMinutes = parseTimeToMinutes(startTime);
      const alarmMinutes = startMinutes - remindMinutes;
      if (alarmMinutes < 0) continue;

      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      targetDate.setHours(Math.floor(alarmMinutes / 60), alarmMinutes % 60, 0, 0);

      if (targetDate.getTime() <= now.getTime()) continue;

      const alarmId = `${course.name}|${targetDate.toISOString().split("T")[0]}|${startSection}`;
      alarms.push({
        alarmId,
        alarmTime: targetDate.getTime(),
        courseName: course.name,
        classroom: course.classroom || "",
        startTime,
        remindMinutes,
      });
    }
  }

  return alarms;
}

let lastAlarmHash = "";

export async function syncClassAlarmsToNative(
  courses: AlarmCourse[],
  currentWeek: AlarmCurrentWeek | null,
  periods: AlarmClassPeriod[],
): Promise<void> {
  if (!isCapacitor()) return;

  const { classReminderEnabled, classReminderMinutes, classReminderDays } = useSettingsStore.getState();
  if (!classReminderEnabled) {
    if (lastAlarmHash) {
      await NotifyPlugin.cancelClassAlarms().catch(() => {});
      lastAlarmHash = "";
    }
    return;
  }

  const alarms = computeClassAlarms(courses, currentWeek, periods, classReminderMinutes, classReminderDays);
  // Use stable fields for dedup (alarmId doesn't depend on timestamps)
  const hash = alarms.map((a) => a.alarmId).sort().join("|");
  if (hash === lastAlarmHash) return;

  await NotifyPlugin.cancelClassAlarms().catch(() => {});
  lastAlarmHash = "";
  if (alarms.length > 0) {
    await NotifyPlugin.scheduleClassAlarms({ alarmsJson: JSON.stringify(alarms) });
    lastAlarmHash = hash;
  }
}
