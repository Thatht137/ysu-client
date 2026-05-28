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

export function computeClassAlarms(
  courses: Course[],
  currentWeek: CurrentWeek | null,
  periods: ClassPeriod[],
  remindMinutes: number = 15,
  days: number = 7,
): ClassAlarmConfig[] {
  const alarms: ClassAlarmConfig[] = [];
  const now = new Date();
  const periodMap = new Map(periods.map((p) => [p.section, p]));
  const todayWeekday = now.getDay() === 0 ? 7 : now.getDay();

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
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

let lastAlarmHash = "";

export async function syncClassAlarmsToNative(
  courses: Course[],
  currentWeek: CurrentWeek | null,
  periods: ClassPeriod[],
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
  const hash = JSON.stringify(alarms);
  if (hash === lastAlarmHash) return;

  await NotifyPlugin.cancelClassAlarms().catch(() => {});
  lastAlarmHash = "";
  if (alarms.length > 0) {
    await NotifyPlugin.scheduleClassAlarms({ alarmsJson: hash });
    lastAlarmHash = hash;
  }
}
