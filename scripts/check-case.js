// Run from the project root (the folder that contains backend/ and frontend/):
//   node scripts/check-case.js
//
// Windows ignores capital letters in file names, but Render and Vercel run on Linux, which does not.
// This reads the files Git is tracking (the names GitHub will have) and checks every relative import.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CODE = /\.(js|jsx|mjs|cjs)$/;
const EXTS = ["", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".svg"];
const IMPORT =
  /(?:from\s+|import\s*\(\s*|import\s+|require\(\s*|jest\.mock\(\s*)["'](\.{1,2}\/[^"']+)["']/g;

const tracked = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const exact = new Set(tracked);
const lowered = new Map(tracked.map((p) => [p.toLowerCase(), p]));

const problems = [];
let checked = 0;

for (const file of tracked.filter(
  (f) => CODE.test(f) && !f.includes("node_modules"),
)) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(IMPORT)) {
    const spec = match[1].split("?")[0];
    const base = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), spec),
    );
    const candidates = EXTS.flatMap((e) => [
      base + e,
      `${base}/index${e || ".js"}`,
    ]);
    checked++;
    if (candidates.some((c) => exact.has(c))) continue;

    const wrongCase = candidates
      .map((c) => lowered.get(c.toLowerCase()))
      .find(Boolean);
    problems.push(
      wrongCase
        ? `CASE     ${file}\n         imports "${spec}" but the file is named "${path.posix.basename(wrongCase)}"`
        : `MISSING  ${file}\n         imports "${spec}" but no such file is tracked by Git (typo, or forgot "git add"?)`,
    );
  }
}

if (problems.length === 0) {
  console.log(
    `OK: ${checked} relative imports checked, all match the file names Git tracks.`,
  );
} else {
  console.log(`${problems.length} problem(s) found:\n`);
  problems.forEach((p) => console.log(p + "\n"));
  process.exitCode = 1;
}
