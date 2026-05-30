/**
 * CAS authentication wrapper for YSU Provider.
 *
 * Wraps lib/cas.ts functions and maps errors to ProviderError.
 */
import {
  prepareLogin as _prepareLogin,
  checkCaptchaNeeded as _checkCaptchaNeeded,
  loginStep1 as _loginStep1,
  requestMFACode as _requestMFACode,
  submitMFACode as _submitMFACode,
  isAuthenticated as _isAuthenticated,
  CASCredential,
  getJar as getCasJar,
  type MFAChallenge,
  CASError,
  NeedCaptchaError,
  IPBlockedError,
  LoginFailedError,
  MFARequiredError,
  MFAFailedError,
  CASProtocolError,
  NotAuthenticatedError,
} from "../../lib/cas";
import { checkRateLimit, recordLoginAttempt } from "../../lib/rate-limit";
import { useAuthStore } from "../../lib/auth-store";
import {
  ProviderError,
  ProviderErrorCode,
  wrapError,
} from "../errors";

/** Result of the first login step. */
export interface LoginStep1Result {
  /** Whether authentication is complete (no MFA needed). */
  authenticated: boolean;
  /** Whether MFA is required to complete login. */
  needsMfa: boolean;
  /** The username that was used for login. */
  username: string;
  /** Serialized CAS credential, if available. */
  credential?: string;
}

export type { MFAChallenge };

function mapCASError(e: unknown): ProviderError {
  if (e instanceof NeedCaptchaError) {
    return new ProviderError(
      ProviderErrorCode.AUTH_CAPTCHA_REQUIRED,
      e.message,
      e,
    );
  }
  if (e instanceof IPBlockedError) {
    return new ProviderError(
      ProviderErrorCode.RATE_LIMITED,
      e.message,
      e,
    );
  }
  if (e instanceof LoginFailedError) {
    return new ProviderError(
      ProviderErrorCode.AUTH_INVALID_CREDENTIAL,
      e.message,
      e,
    );
  }
  if (e instanceof MFARequiredError) {
    return new ProviderError(
      ProviderErrorCode.AUTH_MFA_REQUIRED,
      e.message,
      e,
    );
  }
  if (e instanceof MFAFailedError) {
    return new ProviderError(
      ProviderErrorCode.AUTH_INVALID_CREDENTIAL,
      e.message,
      e,
    );
  }
  if (e instanceof NotAuthenticatedError) {
    return new ProviderError(
      ProviderErrorCode.AUTH_SESSION_EXPIRED,
      e.message,
      e,
    );
  }
  if (e instanceof CASProtocolError) {
    return new ProviderError(
      ProviderErrorCode.UNKNOWN,
      e.message,
      e,
    );
  }
  if (e instanceof CASError) {
    return new ProviderError(
      ProviderErrorCode.UNKNOWN,
      e.message,
      e,
    );
  }
  return wrapError(e);
}

/** Prepare CAS login session (fetch login page, establish JSESSIONID). */
export async function prepareLogin(): Promise<void> {
  try {
    await _prepareLogin();
  } catch (e) {
    throw mapCASError(e);
  }
}

/** Check whether the given username needs a captcha. */
export async function checkCaptchaNeeded(username: string): Promise<boolean> {
  try {
    return await _checkCaptchaNeeded(username);
  } catch {
    return false;
  }
}

/**
 * Perform the first step of CAS login.
 *
 * @param credential - User credential with username, password, and optional captcha.
 * @param skipRateLimit - Whether to skip rate limit checking.
 */
export async function loginStep1(
  credential: { username: string; password: string; captcha?: string },
  skipRateLimit = false,
): Promise<LoginStep1Result> {
  if (!skipRateLimit) {
    const limit = checkRateLimit();
    if (!limit.allowed) {
      throw new ProviderError(
        ProviderErrorCode.RATE_LIMITED,
        `Rate limited: retry after ${Math.ceil(limit.retryAfterMs / 1000)}s`,
      );
    }
    recordLoginAttempt();
  }

  try {
    const result = await _loginStep1(
      credential.username,
      credential.password,
      { captcha: credential.captcha },
    );
    const credStr =
      result.authenticated || result.needsMfa
        ? (await CASCredential.fromJar(getCasJar())).toJSON()
        : undefined;
    return {
      authenticated: result.authenticated,
      needsMfa: result.needsMfa,
      username: result.username,
      credential: credStr,
    };
  } catch (e) {
    throw mapCASError(e);
  }
}

/** Request an MFA code for the given method. */
export async function requestMFACode(
  username: string,
  method: "sms" | "cpdaily" | "weixin",
): Promise<MFAChallenge> {
  try {
    return await _requestMFACode(username, method);
  } catch (e) {
    throw mapCASError(e);
  }
}

/** Submit an MFA code and return the resulting credential. */
export async function submitMFACode(
  challenge: MFAChallenge,
  code: string,
): Promise<string> {
  try {
    const credential = await _submitMFACode(challenge, code);
    return credential.toJSON();
  } catch (e) {
    throw mapCASError(e);
  }
}

/** Check whether the user is currently authenticated with CAS. */
export async function isAuthenticated(): Promise<boolean> {
  try {
    return await _isAuthenticated();
  } catch (e) {
    throw mapCASError(e);
  }
}

/** Save the CAS credential to the auth store. */
export function saveCredential(
  credential: string,
  username?: string,
): void {
  useAuthStore.getState().setCredential(credential, username);
}
