# vendor

Third-party code that ships inside the repo, because Hearth runs from `file://` with no internet.

## three.min.js
- **three.js r186** (npm `three@0.186.0`), MIT. License text in `three.LICENSE`.
- three.js stopped publishing a classic-script build, and Chromium blocks `<script type="module">`
  and import maps on `file://`. This file is the official ES module bundled once into a classic
  script that defines the global `THREE`.
- It is loaded only when the game opens (`app.js` injects the `<script>` the first time).

How it was made (esbuild 0.28.2), from an empty folder:
```bash
npm init -y && npm i three@0.186.0 esbuild
npx esbuild node_modules/three/build/three.module.js --bundle --format=iife --global-name=THREE \
  --minify --legal-comments=none \
  --banner:js="/*! three.js r186 (0.186.0) · MIT · Copyright 2010-2026 three.js authors · classic-script build, see vendor/README.md */" \
  --outfile=three.min.js
```
To upgrade: change the version, run it again, copy `three.min.js` and `node_modules/three/LICENSE`
here, and update this file. The project itself still has no build step.
