// 生成 OTA 元数据和版本公告。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

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
const changelog = readFileSync("CHANGELOG.md", "utf8");
const heading = `## ${RELEASE_VERSION}`;
const sectionStart = changelog.indexOf(heading);
const contentStart = sectionStart < 0 ? -1 : sectionStart + heading.length;
const nextSection = contentStart < 0 ? -1 : changelog.indexOf("\n## ", contentStart);
const body =
  contentStart < 0
    ? `Fighting Club ${RELEASE_VERSION}`
    : changelog.slice(contentStart, nextSection < 0 ? undefined : nextSection).trim();

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
      ? { stable: { ...entry, body } }
      : { prerelease: { ...entry, body } },
};

mkdirSync("release-assets", { recursive: true });
writeFileSync("release-assets/version.json", JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(
  "release-assets/release-notes.md",
  [
    `## Fighting Club ${RELEASE_VERSION}`,
    "",
    body,
    "",
    "### 下载说明",
    "",
    `- **FightingClub-${RELEASE_NAME}.apk**：Android 安装包`,
    "- **dist.zip**：应用内 OTA 更新包",
    "- **version.json**：应用内更新元数据",
    "",
    `Channel: \`${CHANNEL}\` · versionCode: \`${VERSION_CODE}\``,
    "",
  ].join("\n"),
);
console.log("version.json:");
console.log(JSON.stringify(manifest, null, 2));
