/**
 * Secure storage backed by Android Keystore / iOS Keychain.
 *
 * Wraps @aparajita/capacitor-secure-storage for:
 * - Zustand persist adapter (credential, session, username)
 * - Remember-me credentials (username + password)
 * - CASTGC cookie persistence
 */
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { toast } from 'sonner';

// ─── Key constants ──────────────────────────────────────────────────────── //

const CASTGC_KEY = 'ysu-castgc';
const REMEMBER_KEY = 'ysu-remember-me';

// ─── SSR guard ──────────────────────────────────────────────────────────── //
// SecureStorage's web implementation accesses `localStorage` which doesn't
// exist during Next.js SSG. Skip all calls on the server.
const isBrowser = typeof window !== 'undefined';

// ─── Zustand StateStorage adapter ───────────────────────────────────────── //

export const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isBrowser) return null;
    try {
      const value = await SecureStorage.getItem(name);
      return value ?? null;
    } catch (e) {
      toast.error(`安全存储读取失败: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!isBrowser) return;
    try {
      await SecureStorage.setItem(name, value);
    } catch (e) {
      toast.error(`凭据保存失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isBrowser) return;
    try {
      await SecureStorage.removeItem(name);
    } catch (e) {
      toast.error(`安全存储删除失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
};

// ─── Remember-me helpers ────────────────────────────────────────────────── //

export async function saveRememberedCredentials(
  username: string,
  password: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await SecureStorage.set(REMEMBER_KEY, { username, password });
  } catch (e) {
    toast.error(`记住密码保存失败: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function loadRememberedCredentials(): Promise<{
  username: string;
  password: string;
} | null> {
  if (!isBrowser) return null;
  try {
    const data = await SecureStorage.get(REMEMBER_KEY);
    if (
      data &&
      typeof data === 'object' &&
      'username' in data &&
      'password' in data
    ) {
      return data as { username: string; password: string };
    }
    return null;
  } catch (e) {
    toast.error(`读取记住密码失败: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export async function clearRememberedCredentials(): Promise<void> {
  if (!isBrowser) return;
  try {
    await SecureStorage.remove(REMEMBER_KEY);
  } catch {
    // ignore
  }
}

// ─── CASTGC helpers ─────────────────────────────────────────────────────── //

export async function saveCASTGC(value: string): Promise<void> {
  if (!isBrowser) return;
  try {
    await SecureStorage.set(CASTGC_KEY, value);
  } catch (e) {
    toast.error(`登录凭据保存失败: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function loadCASTGC(): Promise<string | null> {
  if (!isBrowser) return null;
  try {
    const val = await SecureStorage.get(CASTGC_KEY);
    if (typeof val === 'string' && val) return val;
    return null;
  } catch (e) {
    toast.error(`读取登录凭据失败: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export async function removeCASTGC(): Promise<void> {
  if (!isBrowser) return;
  try {
    await SecureStorage.remove(CASTGC_KEY);
  } catch {
    // ignore
  }
}
