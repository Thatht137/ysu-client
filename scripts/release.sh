#!/usr/bin/env bash
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo "Building version ${VERSION}..."
npm run build

echo "Creating dist.zip..."
cd dist
zip -r ../dist.zip . -x '*.DS_Store'
cd ..

echo "Creating GitHub release ${TAG}..."
gh release create "${TAG}" dist.zip \
  --title "${TAG}" \
  --generate-notes \
  --latest

echo "Release ${TAG} published!"
rm dist.zip
