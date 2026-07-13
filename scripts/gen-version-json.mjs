// Generate release-assets/version.json for OTA manifest.
// Invoked by .github/workflows/release.yml "Prepare release assets" step.
import { mkdirSync, writeFileSync } from "node:fs";

const {
  RELEASE_VERSION,
  RELEASE_NAME,
  VERSION_CODE,
  CHANNEL,
} = process.env;

if (!RELEASE_VERSION || !RELEASE_NAME || !VERSION_CODE || !CHANNEL) {
  console.error("Missing env: RELEASE_VERSION, RELEASE_NAME, VERSION_CODE, CHANNEL");
  process.exit(1);
}

const REPO_RELEASES_BASE = "https://github.com/Thatht137/ysu-client/releases";
const tagUrl = `${REPO_RELEASES_BASE}/download/${RELEASE_NAME}`;
const apkUrl = `${tagUrl}/FightingClub-${RELEASE_NAME}.apk`;
const distUrl = `${tagUrl}/dist.zip`;
const body = `Fighting Club ${RELEASE_VERSION}`;

const entry = {
  webVersion: RELEASE_VERSION,
  webDownloadUrl: distUrl,
  apkVersionCode: Number(VERSION_CODE),
  apkDownloadUrl: apkUrl,
  body,
};

const manifest = {
  ...entry,
  channels:
    CHANNEL === "stable"
      ? { stable: { ...entry, body: `${body} stable` } }
      : { prerelease: { ...entry, body: `${body} prerelease` } },
};

mkdirSync("release-assets", { recursive: true });
writeFileSync("release-assets/version.json", JSON.stringify(manifest, null, 2) + "\n");
console.log("version.json:");
console.log(JSON.stringify(manifest, null, 2));
