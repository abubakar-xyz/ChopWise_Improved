#!/usr/bin/env bash
set -euo pipefail

echo "⏳ Node $(node -v) | NPM $(npm -v)"

# 1) Validate JSON syntax
echo "🔍 Validating package.json..."
jq . package.json >/dev/null

# 2) Install exact dependencies
echo "📦 Installing dependencies via npm ci..."
npm ci

# 3) Build and export static site
echo "🚧 Building site..."
npm run build

echo "✅ Build succeeded!"
