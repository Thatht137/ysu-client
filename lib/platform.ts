/** 检测当前运行环境是 Capacitor、Tauri 还是纯 Web。 */

export function isCapacitor(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export function isWeb(): boolean {
  return !isCapacitor() && !isTauri();
}
