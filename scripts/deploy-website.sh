#!/usr/bin/env bash
set -euo pipefail

REPO="Youwenqwq/ysu-client"

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

# Fetch latest OTA files from GitHub release so download page keeps working
echo "Fetching latest OTA files from GitHub release..."
LATEST_TAG=$(gh release list --repo "$REPO" --limit 1 --json tagName -q '.[0].tagName' 2>/dev/null || true)

if [[ -n "${LATEST_TAG:-}" ]]; then
  mkdir -p website/public/updates
  # Remove old OTA files before downloading fresh ones
  rm -f website/public/updates/dist.zip website/public/updates/app-release.apk website/public/updates/version.json
  gh release download "$LATEST_TAG" --repo "$REPO" \
    --pattern "dist.zip" --pattern "app-release.apk" --pattern "version.json" \
    --dir website/public/updates/ 2>/dev/null || true
else
  echo "Warning: no GitHub release found, skipping OTA files."
fi

# Announcement management
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

echo ""
echo "========================================"
echo "Deploying website to EdgeOne Pages..."
echo "========================================"
rm -rf .edgeone
export PAGES_SOURCE=skills
cd website
edgeone pages deploy
cd ..

echo "Website deployed!"
