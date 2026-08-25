const fs = require("fs");
const path = require("path");

// index.ts (and users.js/sites.js/availability.js/scheduled.js themselves)
// require these plain JS files at runtime via `require("./x")`, resolved
// relative to lib/ - but tsc only compiles .ts files into lib/, so without
// this copy step the deployed function crashes on cold start with "Cannot
// find module './users'" (etc.) even though the build succeeds.
const rootDir = path.resolve(__dirname, "..");

// Single source of truth for which plain-JS files (as opposed to
// TypeScript, which tsc handles) need to end up in lib/ - also imported by
// verify-runtime-sync.js so the two can't drift apart.
const RUNTIME_JS_FILES = [
  "users.js",
  "sites.js",
  "availability.js",
  "scheduled.js",
  "authHelpers.js",
  "validation.js",
];

function copyRuntimeJsFiles() {
  for (const file of RUNTIME_JS_FILES) {
    fs.copyFileSync(path.join(rootDir, "src", file), path.join(rootDir, "lib", file));
  }
  return RUNTIME_JS_FILES.length;
}

if (require.main === module) {
  const count = copyRuntimeJsFiles();
  console.log(`Copied ${count} runtime JS file(s) from src/ to lib/.`);
}

module.exports = { RUNTIME_JS_FILES, copyRuntimeJsFiles };
