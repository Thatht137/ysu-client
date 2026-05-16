import { toast } from "sonner";
import {
  loginStep1,
  requestMFACode,
  submitMFACode,
  CASCredential,
  resetCAS,
  checkCaptchaNeeded,
  prepareLogin,
  getJar,
} from "./cas";
import { checkRateLimit, recordLoginAttempt } from "./rate-limit";
import { resetJWXT } from "./jwxt";
import { initSDK } from "./sdk";
import { useAuthStore } from "./auth-store";
import { useMFAModalStore } from "./mfa-modal-store";
import { getText } from "./i18n/get-text";
import { loadRememberedCredentials } from "./secure-storage";

let inflightAutoLogin: Promise<boolean> | null = null;

export async function tryAutoLogin(): Promise<boolean> {
  if (inflightAutoLogin) return inflightAutoLogin;

  const remembered = await loadRememberedCredentials();
  if (!remembered) return false;

  inflightAutoLogin = (async () => {
    try {
      resetCAS();
      resetJWXT();

      await prepareLogin();
      const limit = checkRateLimit();
      if (!limit.allowed) {
        const totalSeconds = Math.ceil(limit.retryAfterMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const message =
          limit.reason === "window"
            ? `15分钟内登录次数已达上限，请 ${minutes}:${seconds.toString().padStart(2, "0")} 后再试`
            : `登录过于频繁，请 ${seconds} 秒后再试`;
        toast.error(message);
        return false;
      }
      recordLoginAttempt();

      if (await checkCaptchaNeeded(remembered.username)) {
        toast.error(getText("autoLogin.captchaRequired"));
        return false;
      }

      const step1 = await loginStep1(
        remembered.username,
        remembered.password,
      );

      if (step1.authenticated) {
        const credential = await CASCredential.fromJar(getJar());
        const json = credential.toJSON();
        useAuthStore.getState().setCredential(json, remembered.username);
        await initSDK();
        return true;
      }

      if (step1.needsMfa) {
        const mfaRes = await requestMFACode(remembered.username, "cpdaily");
        const store = useMFAModalStore.getState();

        try {
          const code = await store.showMFA({
            username: remembered.username,
            methodCode: mfaRes.methodCode,
            mobileHint: mfaRes.mobileHint,
          });

          const credential = await submitMFACode(mfaRes, code);
          const json = credential.toJSON();
          useAuthStore.getState().setCredential(json, remembered.username);
          await initSDK();
          return true;
        } catch {
          return false;
        }
      }

      return false;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "NEED_CAPTCHA") {
        toast.error(getText("autoLogin.captchaRequired"));
      }
      return false;
    } finally {
      inflightAutoLogin = null;
    }
  })();

  return inflightAutoLogin;
}
