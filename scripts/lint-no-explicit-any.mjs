import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectoryNames = new Set([".git", ".next", "dist", "node_modules", "coverage"]);
const checkedExtensions = new Set([".ts", ".tsx"]);
const explicitAnyPatterns = [
  /:\s*any\b/u,
  /\bas\s+any\b/u,
  /<\s*any\b/u,
  /\bany\s*\[\s*\]/u,
  /\bArray\s*<\s*any\b/u,
  /\bPromise\s*<\s*any\b/u,
  /\bRecord\s*<[^>]*\bany\b/u
];

const sourceFiles = [];

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      if (ignoredDirectoryNames.has(entry.name)) {
        return;
      }

      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await collectTypeScriptFiles(fullPath);
        return;
      }

      if (entry.isFile() && checkedExtensions.has(path.extname(entry.name))) {
        sourceFiles.push(fullPath);
      }
    })
  );
}

function stripTrailingLineComment(line) {
  const commentStart = line.indexOf("//");
  return commentStart === -1 ? line : line.slice(0, commentStart);
}

await collectTypeScriptFiles(root);

const violations = [];

for (const filePath of sourceFiles) {
  const contents = await readFile(filePath, "utf8");
  const lines = contents.split("\n");

  lines.forEach((line, index) => {
    const checkableLine = stripTrailingLineComment(line);
    if (explicitAnyPatterns.some((pattern) => pattern.test(checkableLine))) {
      violations.push(`${path.relative(root, filePath)}:${index + 1}`);
    }
  });
}

if (violations.length > 0) {
  console.error("Explicit any is not allowed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
}
