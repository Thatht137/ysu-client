// Compute release metadata from package.json + tag, write to GITHUB_ENV.
// Invoked by .github/workflows/release.yml "Compute release metadata" step.
import semver from "semver";
import pkg from "../package.json" with { type: "json" };
import { appendFileSync } from "node:fs";

const TAG_NAME = process.env.TAG_NAME ?? "";
const tag = TAG_NAME.replace(/^v/, "");
const version = tag || pkg.version;
const v = semver.parse(version);
if (!v) throw new Error(`Invalid version: ${version}`);

const pre = v.prerelease;
let stageCode;
let channel;
if (!pre || pre.length === 0) {
  stageCode = 99;
  channel = "stable";
} else if (pre[0] === "alpha") {
  stageCode = pre[1];
  channel = "prerelease";
} else if (pre[0] === "beta") {
  stageCode = 20 + pre[1];
  channel = "prerelease";
} else if (pre[0] === "rc") {
  stageCode = 50 + pre[1];
  channel = "prerelease";
} else {
  stageCode = 99;
  channel = "stable";
}
const versionCode = v.major * 1000000 + v.minor * 10000 + v.patch * 100 + stageCode;
const isPrerelease = channel === "prerelease" ? "true" : "false";
const releaseName = `v${version}`;

const out = [
  `PKG_VERSION=${pkg.version}`,
  `RELEASE_VERSION=${version}`,
  `RELEASE_NAME=${releaseName}`,
  `VERSION_CODE=${versionCode}`,
  `CHANNEL=${channel}`,
  `IS_PRERELEASE=${isPrerelease}`,
  "", // trailing newline
].join("\n");

console.log(out);
const ghEnv = process.env.GITHUB_ENV;
if (ghEnv) appendFileSync(ghEnv, out);
else console.warn("GITHUB_ENV not set; metadata printed to stdout only.");
