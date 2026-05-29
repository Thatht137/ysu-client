#!/usr/bin/env bash
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"
REPO="Youwenqwq/ysu-client"

# Preflight checks
echo "Running preflight checks..."

# Ensure gh is authenticated
gh auth status || { echo "Error: gh CLI not authenticated. Run 'gh auth login'."; exit 1; }

# Ensure on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "${CURRENT_BRANCH}" != "main" ]]; then
  echo "Error: Must be on main branch, currently on '${CURRENT_BRANCH}'."
  exit 1
fi

# Ensure working directory is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: Working directory has uncommitted changes. Commit or stash them first."
  exit 1
fi

# Ensure current commit is pushed to origin
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main 2>/dev/null || echo "")
if [[ "${LOCAL_COMMIT}" != "${REMOTE_COMMIT}" ]]; then
  echo "Error: Current commit is not pushed to origin/main. Push first: git push origin main"
  exit 1
fi

# Ensure tag does not already exist (local or remote)
if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "Error: Tag ${TAG} already exists locally."
  exit 1
fi
if git ls-remote --tags origin "refs/tags/${TAG}" | grep -q .; then
  echo "Error: Tag ${TAG} already exists on remote."
  exit 1
fi

echo "Preflight checks passed."

# Temp file cleanup trap
cleanup() {
  [[ -n "${TMP_NOTES:-}" ]] && rm -f "$TMP_NOTES"
  rm -rf .edgeone
}
trap cleanup EXIT

echo "Building version ${VERSION}..."
npm run build

echo "Creating dist.zip..."
cd dist
zip -r ../dist.zip . -x '*.DS_Store'
cd ..

echo "Building Android APK..."
npx cap sync
cd android
./gradlew assembleRelease
cd ..
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

# Read versionName from build.gradle and compute versionCode
APK_VERSION_NAME=$(grep 'versionName' android/app/build.gradle | grep -oP '"[0-9]+\.[0-9]+\.[0-9]+"' | tr -d '"')
IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "${APK_VERSION_NAME}"
APK_VERSION_CODE=$(( V_MAJOR * 10000 + V_MINOR * 100 + V_PATCH ))

echo "Creating GitHub release ${TAG}..."
gh release create "${TAG}" dist.zip "${APK_PATH}" \
  --target "$(git rev-parse HEAD)" \
  --title "${TAG}" \
  --generate-notes \
  --latest

echo "Fetching release notes..."
TMP_NOTES=$(mktemp)
gh release view "${TAG}" --json body -q '.body' > "$TMP_NOTES" || true

if [[ -t 0 ]] && [[ -z "${CI:-}" ]]; then
  echo "Opening editor for release notes..."
  ${EDITOR:-nano} "$TMP_NOTES"
fi

# Sync edited notes back to the GitHub release
gh release edit "${TAG}" --notes-file "$TMP_NOTES"

BODY=$(cat "$TMP_NOTES")
rm "$TMP_NOTES"

echo "Generating version.json with release notes..."
cat > version.json <<EOF
{
  "apkVersionCode": ${APK_VERSION_CODE},
  "webVersion": "${VERSION}",
  "apkDownloadUrl": "https://github.com/${REPO}/releases/download/${TAG}/app-release.apk",
  "body": $(echo "$BODY" | jq -Rs .)
}
EOF

echo "Uploading version.json..."
gh release upload "${TAG}" version.json --clobber

# Generate changelog.json from GitHub releases
echo "Generating changelog.json..."
gh api "repos/${REPO}/releases" | jq 'map({
  version: (.tag_name | ltrimstr("v")),
  date: (.published_at | fromdateiso8601 + 28800 | strftime("%Y-%m-%d")),
  body: .body
})' > website/src/data/changelog.json

# Copy OTA files to website dist
mkdir -p website/public/updates
cp dist.zip website/public/updates/
cp "${APK_PATH}" website/public/updates/app-release.apk
cp version.json website/public/updates/

# Announcement management
edit_announcement() {
  local file="$1"
  local tmpfile
  tmpfile=$(mktemp)

  if [[ -f "$file" ]]; then
    cp "$file" "$tmpfile"
  else
    local now expire
    now=$(node -e "console.log(new Date().toISOString())")
    expire=$(node -e "const d = new Date(); d.setUTCDate(d.getUTCDate() + 7); console.log(d.toISOString())")
    cat > "$tmpfile" <<EOF
{
  "id": "$(date +%Y%m%d-%H%M%S)",
  "title": "公告标题",
  "content": "公告内容，支持 **Markdown** 格式。",
  "level": "info",
  "publishedAt": "${now}",
  "expireAt": "${expire}"
}
EOF
  fi

  ${EDITOR:-nano} "$tmpfile"

  if ! jq empty "$tmpfile" 2>/dev/null; then
    echo "Error: Invalid JSON. Aborting."
    rm -f "$tmpfile"
    return 1
  fi

  if ! jq -e '.id and .title and .content and .level and .expireAt' "$tmpfile" >/dev/null 2>&1; then
    echo "Error: Missing required fields (id, title, content, level, expireAt). Aborting."
    rm -f "$tmpfile"
    return 1
  fi

  mv "$tmpfile" "$file"
  echo "Announcement saved."
}

ANNOUNCEMENT_FILE="website/public/updates/announcement.json"
mkdir -p "$(dirname "$ANNOUNCEMENT_FILE")"

echo ""
if [[ -f "$ANNOUNCEMENT_FILE" ]]; then
  echo "Current announcement:"
  jq -r '"  \(.title) [\(.level)] (expires: \(.expireAt))"' "$ANNOUNCEMENT_FILE" 2>/dev/null || echo "  (exists but unable to parse)"
  read -p "Update announcement? [y/N] " -n 1 -r
else
  echo "No active announcement."
  read -p "Create announcement? [y/N] " -n 1 -r
fi
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  edit_announcement "$ANNOUNCEMENT_FILE"
fi

# Deploy to EdgeOne Pages
echo ""
echo "========================================"
echo "Deploying website to EdgeOne Pages..."
echo "========================================"
rm -rf .edgeone
export PAGES_SOURCE=skills
cd website
edgeone pages deploy
cd ..

echo "Release ${TAG} published!"
rm -f dist.zip version.json
