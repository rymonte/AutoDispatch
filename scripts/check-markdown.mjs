import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { lint } from "markdownlint/promise";

// Preserve the four discovery artifacts excluded by the previous CLI config.
const archived = new Set([
  "prd.md",
  "prd-v0.3.md",
  "data-model-proposal.md",
  "domain-persistence-proposal.md",
]);
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(
    (file) =>
      file.endsWith(".md") &&
      !file.startsWith("node_modules/") &&
      !archived.has(file) &&
      existsSync(file),
  )
  .sort();
const config = JSON.parse(
  readFileSync(new URL("../.markdownlint.json", import.meta.url), "utf8"),
);
const results = await lint({ files, config });
const diagnostics = Object.entries(results).flatMap(([file, issues]) =>
  issues.map(
    (issue) =>
      `${file}:${issue.lineNumber} ${issue.ruleNames[0]} ${issue.ruleDescription}${issue.errorDetail ? ` (${issue.errorDetail})` : ""}`,
  ),
);
if (diagnostics.length) {
  console.error(diagnostics.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Markdown lint passed for ${files.length} files.`);
}
