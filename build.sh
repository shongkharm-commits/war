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

# 1) Compile the app (JSX -> app.js)
npx --yes esbuild@0.24.0 src/app.jsx \
  --outfile=app.js \
  --bundle \
  --format=esm \
  --minify \
  --target=es2019 \
  --external:https://*
echo "Built app.js"

# 2) Compile Tailwind CSS (only the classes actually used -> styles.css)
cat > /tmp/sf_tw.config.js <<CFG
module.exports = {
  darkMode: 'class',
  content: ['./index.html','./src/app.jsx'],
  theme: { extend: {} },
  plugins: [],
};
CFG
printf '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' > /tmp/sf_tw.input.css
npx --yes tailwindcss@3.4.17 -c /tmp/sf_tw.config.js -i /tmp/sf_tw.input.css -o styles.css --minify
echo "Built styles.css"
