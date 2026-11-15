import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseDocument } from "yaml";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const archived = new Set([
  "prd.md",
  "prd-v0.3.md",
  "data-model-proposal.md",
  "domain-persistence-proposal.md",
]);
let errors = [];
for (const file of files) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  try {
    if (file.endsWith(".json")) JSON.parse(text);
    if (/\.ya?ml$/.test(file)) {
      const doc = parseDocument(text, { uniqueKeys: true });
      if (doc.errors.length) throw new Error(doc.errors.join("\n"));
    }
    if (file.startsWith(".github/workflows/")) {
      for (const match of text.matchAll(/uses:\s*([^\s#]+)/g)) {
        if (!/^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/.test(match[1]))
          throw new Error(`Unpinned action: ${match[1]}`);
      }
    }
    if (file.endsWith(".md") && !archived.has(file)) {
      for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (!target || /^[a-z]+:/i.test(target)) continue;
        if (!existsSync(resolve(dirname(file), decodeURIComponent(target))))
          throw new Error(`Missing local link: ${target}`);
      }
    }
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("JSON/YAML, local documentation links and action pins validated.");
