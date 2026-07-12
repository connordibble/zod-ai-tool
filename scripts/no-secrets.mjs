import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
]);
const ignoredFiles = new Set(["pnpm-lock.yaml", "scripts/no-secrets.mjs"]);
const patterns = [
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9_]{36,255}/,
  /xox[baprs]-[0-9A-Za-z-]+/,
  /sk-[A-Za-z0-9]{20,}/,
  /NPM_TOKEN\s*=\s*\S+/,
  /GITHUB_TOKEN\s*=\s*\S+/,
];

const matches = [];

await scan(root);

if (matches.length > 0) {
  for (const match of matches) {
    console.error(
      `${match.file}:${match.line}: possible secret matched ${match.pattern}`,
    );
  }

  process.exitCode = 1;
} else {
  console.log("No obvious secrets detected.");
}

async function scan(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    const relativePath = path
      .relative(root, fullPath)
      .split(path.sep)
      .join("/");

    if (entry.isDirectory()) {
      await scan(fullPath);
      continue;
    }

    if (!entry.isFile() || ignoredFiles.has(relativePath)) {
      continue;
    }

    const content = await fs.readFile(fullPath, "utf8").catch(() => undefined);
    if (content === undefined) {
      continue;
    }

    content.split("\n").forEach((line, index) => {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          matches.push({
            file: relativePath,
            line: index + 1,
            pattern: pattern.source,
          });
        }
      }
    });
  }
}
