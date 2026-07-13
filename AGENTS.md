# Project Memory — Fork Release Workflow

## Repo identity
- **Origin (this fork)**: `https://github.com/Thatht137/ysu-client.git`
- **Upstream**: `https://github.com/Youwenqwq/ysu-client` (do NOT push releases here)
- `scripts/release.sh` has `REPO="Youwenqwq/ysu-client"` hardcoded — **do not run it on this fork**, it would push to upstream. Use the GitHub Actions workflow instead.

## Release mechanism (this fork)
- Workflow: `.github/workflows/release.yml`
- Triggers:
  - `push: tags: v*` — auto-runs on any `v`-prefixed tag push
  - `workflow_dispatch` — manual run from Actions tab, with `tag` + `prerelease` inputs
- Builds: Next.js static export → Capacitor sync → signed release APK → `dist.zip` → `version.json` → GitHub Release

## Secrets (already configured on fork)
- `FIGHTING_CLUB_KEYSTORE_BASE64`
- `FIGHTING_CLUB_KEYSTORE_PASSWORD`
- `FIGHTING_CLUB_KEY_PASSWORD`
- Keystore alias: `fighting-club`

## Known workflow bugs (pre-existing, not yet fixed)
1. **`version.json` is hardcoded** to `1.0.0` / `apkVersionCode: 1000099` (release.yml lines ~87-100). Does not read from `package.json`. OTA users get wrong version metadata.
2. **`prerelease` flag only set via `workflow_dispatch` input** (line ~109). When triggered by `push: tags: v*`, `prerelease` is always `false` — rc/beta/alpha tags get mislabeled as stable releases.
3. Release channel logic: rc/beta/alpha should write to `channels.prerelease` only; stable writes to `channels.stable`. Current workflow doesn't do channel routing at all.

## Correct release sequence (fork)
1. Merge PR into fork's `main` (via GitHub web UI)
2. `git checkout main && git pull`
3. `git tag v<version> && git push origin v<version>` — triggers workflow
4. Wait for Action to finish, verify Release assets (APK + dist.zip + version.json)

## Version policy
- `package.json` version and `android/app/build.gradle` `versionName` must stay in sync
- APK versionCode = `major*1000000 + minor*10000 + patch*100 + stageCode`
  - stable: stageCode = 99
  - alpha.N: stageCode = N (1..19)
  - beta.N: stageCode = 20 + N (21..49)
  - rc.N: stageCode = 50 + N (51..98)
- Prerelease (rc/beta/alpha) → update only `channels.prerelease` in version.json
- Stable → update `channels.stable`

## Current state
- Branch `refactor/de-slop-ui` pushed to fork, PR created (PR target: fork's own `main`)
- Version bumped to `1.0.1-rc.1` in `package.json` + `android/app/build.gradle`
- User accidentally triggered an Action build before merging PR — that build will produce a release tagged on whatever commit was pushed/tagged, possibly with the hardcoded 1.0.0 version.json. Verify the resulting Release and delete/amend if wrong.
