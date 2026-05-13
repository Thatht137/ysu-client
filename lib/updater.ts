import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { APP_VERSION } from "./version";

export interface UpdateInfo {
  available: boolean;
  version: string;
  downloadUrl: string;
  body: string;
}

export interface UpdateMirror {
  label: string;
  value: string;
}

export const UPDATE_MIRRORS: readonly UpdateMirror[] = [
  { label: "GitHub 直连", value: "" },
  { label: "ghproxy.com", value: "https://ghproxy.com/" },
  { label: "ghfast.top", value: "https://ghfast.top/" },
];

const GITHUB_API =
  "https://api.github.com/repos/Youwenqwq/ysu-client/releases/latest";
const ASSET_NAME = "dist.zip";
const LAST_CHECK_KEY = "ysu-last-update-check";
const CHECK_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/** Compare two semver strings (major.minor.patch). Returns true if target > current. */
export function isNewer(current: string, target: string): boolean {
  const c = current.split(".").map(Number);
  const t = target.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((t[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((t[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}

/** Check GitHub Releases for a newer version. Respects 30-min cooldown when `auto` is true. */
export async function checkForUpdate(
  auto = false,
  mirrorPrefix = "",
): Promise<UpdateInfo> {
  if (auto) {
    const last = localStorage.getItem(LAST_CHECK_KEY);
    if (last && Date.now() - Number(last) < CHECK_COOLDOWN_MS) {
      return { available: false, version: "", downloadUrl: "", body: "" };
    }
  }

  const apiUrl = mirrorPrefix ? `${mirrorPrefix}${GITHUB_API}` : GITHUB_API;

  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (res.status === 403) {
      throw new Error("RATE_LIMIT");
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const tagName: string = data.tag_name ?? "";
    const version = tagName.replace(/^v/, "");
    const body: string = data.body ?? "";
    const assets: Array<{ name: string; browser_download_url: string }> =
      data.assets ?? [];
    const asset = assets.find((a) => a.name === ASSET_NAME);

    if (!asset || !version) {
      return { available: false, version: "", downloadUrl: "", body: "" };
    }

    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

    const downloadUrl = mirrorPrefix
      ? `${mirrorPrefix}${asset.browser_download_url}`
      : asset.browser_download_url;

    return {
      available: isNewer(APP_VERSION, version),
      version,
      downloadUrl,
      body,
    };
  } catch (err) {
    if (auto) return { available: false, version: "", downloadUrl: "", body: "" };
    throw err;
  }
}

/** Download the update bundle and set it as the next active bundle. */
export async function downloadAndApply(
  info: UpdateInfo,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const listener = await CapacitorUpdater.addListener("download", (state) => {
    onProgress?.(state.percent);
  });

  try {
    const bundle = await CapacitorUpdater.download({
      url: info.downloadUrl,
      version: info.version,
    });
    await CapacitorUpdater.next({ id: bundle.id });
  } finally {
    await listener.remove();
  }
}

/** Immediately apply the pending bundle and restart the app. */
export async function applyAndRestart(): Promise<void> {
  await CapacitorUpdater.reload();
}

/** Reset to the original bundled assets (emergency rollback). */
export async function resetToBuiltin(): Promise<void> {
  await CapacitorUpdater.reset();
}
