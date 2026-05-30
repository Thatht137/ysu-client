/**
 * Provider error system.
 *
 * Defines the error codes used across all providers, the ProviderError class,
 * and utilities for type-guarding and wrapping unknown errors.
 */

export enum ProviderErrorCode {
  AUTH_INVALID_CREDENTIAL = 'AUTH_INVALID_CREDENTIAL',
  AUTH_CAPTCHA_REQUIRED = 'AUTH_CAPTCHA_REQUIRED',
  AUTH_MFA_REQUIRED = 'AUTH_MFA_REQUIRED',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  FEATURE_NOT_SUPPORTED = 'FEATURE_NOT_SUPPORTED',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN',
}

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly cause?: unknown;

  constructor(code: ProviderErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.cause = cause;
  }
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

export function wrapError(error: unknown): ProviderError {
  if (isProviderError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ProviderError(ProviderErrorCode.UNKNOWN, error.message, error);
  }

  return new ProviderError(
    ProviderErrorCode.UNKNOWN,
    typeof error === 'string' ? error : 'An unknown error occurred',
    error,
  );
}
