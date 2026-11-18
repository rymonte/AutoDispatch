import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const runner = fileURLToPath(new URL("check-markdown.mjs", import.meta.url));

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "autodispatch-markdown-"));
  t.after(() => {
    assert.equal(dirname(cwd), tmpdir());
    rmSync(cwd, { recursive: true, force: true });
  });
  execFileSync("git", ["init", "--quiet", cwd]);
  const write = (file, content) => {
    const target = join(cwd, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  const run = () =>
    spawnSync(process.execPath, [runner], { cwd, encoding: "utf8" });
  return { cwd, write, run };
}

test("checks tracked and new Markdown, including hidden paths and spaces", (t) => {
  const { cwd, write, run } = fixture(t);
  const invalid = "# Title\n\n### Skipped heading level\n";
  write("tracked.md", invalid);
  execFileSync("git", ["-C", cwd, "add", "tracked.md"]);
  write(".github/new guide.md", invalid);
  write("docs/new guide.md", invalid);
  const result = run();
  assert.equal(result.status, 1, result.stderr);
  for (const path of [
    "tracked.md",
    ".github/new guide.md",
    "docs/new guide.md",
  ]) {
    assert.ok(result.stderr.includes(path), result.stderr);
  }
  assert.match(result.stderr, /MD001/);
});

test("preserves archive exclusions and lint rules without excluding nested names", (t) => {
  const { write, run } = fixture(t);
  const invalid = "# Title\n\n### Skipped heading level\n";
  for (const file of [
    "prd.md",
    "prd-v0.3.md",
    "data-model-proposal.md",
    "domain-persistence-proposal.md",
    "node_modules/example/README.md",
  ]) {
    write(file, invalid);
  }
  write("README.md", `# Title\n\n${"Long line ".repeat(20).trim()}\n`);
  const clean = run();
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /passed for 1 files/);
  write("docs/prd.md", invalid);
  const nested = run();
  assert.equal(nested.status, 1, nested.stderr);
  assert.match(nested.stderr, /docs\/prd\.md.*MD001/);
});

test("ignores generated untracked files but still checks tracked ignored files", (t) => {
  const { cwd, write, run } = fixture(t);
  write(".gitignore", "generated/\n");
  write("generated/ignored.md", "# Title\n\n### Skipped heading level\n");
  write("generated/tracked.md", "# Title\n\n### Skipped heading level\n");
  execFileSync("git", ["-C", cwd, "add", "--force", "generated/tracked.md"]);
  const result = run();
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /generated\/tracked\.md/);
  assert.ok(!result.stderr.includes("generated/ignored.md"), result.stderr);
});
