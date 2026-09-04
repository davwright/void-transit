#!/bin/bash
# Deploy to GitHub Pages
# Usage: bash scripts/deploy.sh "commit message"
#
# Steps:
# 1. Encode data-plain → src/data
# 2. Run tests (abort on failure)
# 3. Build browser bundle (auto-patches version)
# 4. Read the new version from package.json
# 5. Commit docs + package.json with version in message
# 6. Push + push tags
# 7. Check for open issues

set -e

MSG="${1:-Deploy}"

echo "═══ Encoding data..."
npx ts-node scripts/encode-from-plain.ts

echo "═══ Running tests..."
# set -e already aborts on failure; keep the explicit message for the log.
if ! npm test; then
  echo "Tests failed. Aborting deploy."
  exit 1
fi

echo "═══ Building browser bundle..."
npm run build:browser

# Read version AFTER build (prebuild patches it)
VERSION=$(node -e "console.log(require('./package.json').version)")

echo "═══ Version: $VERSION"

echo "═══ Committing and pushing..."
git add docs/ package.json package-lock.json
git commit -m "Build v${VERSION} for GitHub Pages — ${MSG}

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"

git push
git push --tags

echo "═══ Deployed v${VERSION} to GitHub Pages"
echo ""

# Check for open issues
ISSUES=$(gh issue list --state open 2>&1)
if [ -z "$ISSUES" ]; then
  echo "✓ Zero open issues"
else
  echo "⚠ Open issues:"
  echo "$ISSUES"
fi
