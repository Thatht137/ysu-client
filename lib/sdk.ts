/**
 * SDK 初始化层 —— CAS / JWXT 模块状态管理。
 *
 * 从 auth-store 加载/保存凭据,提供状态恢复与重置。
 */
import {
  CASCredential,
  restoreCredential,
  resetCAS,
  getJar as getCasJar,
} from "./cas";
import { resetJWXT, getJar as getJwxtJar } from "./jwxt";
import { useAuthStore } from "./auth-store";

/** 从 auth-store 恢复 CAS 凭据到 cas jar。 */
export async function initSDK(): Promise<void> {
  const credentialJson = useAuthStore.getState().credential;
  if (credentialJson) {
    const credential = CASCredential.fromJSON(credentialJson);
    await restoreCredential(credential);
  }
}

/** 重置所有 SDK 状态(登出时调用)。 */
export function resetSDK(): void {
  resetCAS();
  resetJWXT();
}

/** 获取 CAS cookie jar(调试用)。 */
export { getCasJar };
/** 获取 JWXT cookie jar(调试用)。 */
export { getJwxtJar };
