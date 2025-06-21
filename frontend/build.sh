#!/usr/bin/env bash
set -euo pipefail

echo "⏳ Node $(node -v) | NPM $(npm -v)"

echo "🔍 Validating package.json..."
jq . package.json >/dev/null

echo "📦 Installing dependencies via npm ci..."
npm ci

echo "🚧 Building site..."
npm run build

echo "✅ Build succeeded!"
