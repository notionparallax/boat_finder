const fs = require("fs");
const path = require("path");

// index.ts requires these plain JS files at runtime via `require("./x")`,
// resolved relative to lib/ - but tsc only compiles .ts files into lib/, so
// without this copy step the deployed function crashes on cold start with
// "Cannot find module './users'" (etc.) even though the build succeeds.
const rootDir = path.resolve(__dirname, "..");
const runtimeJsFiles = ["users.js", "sites.js", "availability.js", "scheduled.js"];

for (const file of runtimeJsFiles) {
  fs.copyFileSync(path.join(rootDir, "src", file), path.join(rootDir, "lib", file));
}

console.log(`Copied ${runtimeJsFiles.length} runtime JS file(s) from src/ to lib/.`);
