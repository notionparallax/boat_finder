const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

const filePairs = [
  ["src/users.js", "lib/users.js"],
  ["src/sites.js", "lib/sites.js"],
];

function readNormalized(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  return fs.readFileSync(fullPath, "utf8").replace(/\r\n/g, "\n");
}

const mismatches = [];

for (const [srcPath, libPath] of filePairs) {
  const srcExists = fs.existsSync(path.join(rootDir, srcPath));
  const libExists = fs.existsSync(path.join(rootDir, libPath));

  if (!srcExists || !libExists) {
    mismatches.push({
      srcPath,
      libPath,
      reason: "missing",
    });
    continue;
  }

  const srcContent = readNormalized(srcPath);
  const libContent = readNormalized(libPath);

  if (srcContent !== libContent) {
    mismatches.push({
      srcPath,
      libPath,
      reason: "different",
    });
  }
}

if (mismatches.length > 0) {
  console.error("Runtime sync check failed. Source and deployed runtime files differ:");
  for (const mismatch of mismatches) {
    if (mismatch.reason === "missing") {
      console.error(`- Missing pair: ${mismatch.srcPath} <-> ${mismatch.libPath}`);
    } else {
      console.error(`- Different content: ${mismatch.srcPath} <-> ${mismatch.libPath}`);
    }
  }
  console.error("\nAlign files before deploying so Cloud Functions runtime matches source validation logic.");
  process.exit(1);
}

console.log("Runtime sync check passed.");
