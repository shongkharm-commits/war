#!/usr/bin/env bash
# Pre-compiles the app so the browser does NOT need in-browser Babel (much faster startup).
#
# Source of truth for the app code is  src/app.jsx
# This compiles it to  app.js  (which index.html loads as a normal ES module).
#
# Run this after EVERY edit to src/app.jsx, then commit both src/app.jsx and app.js.
#
# Usage:  bash build.sh
set -e
npx --yes esbuild@0.24.0 src/app.jsx \
  --outfile=app.js \
  --bundle \
  --format=esm \
  --minify \
  --target=es2019 \
  --external:https://*
echo "Built app.js"
