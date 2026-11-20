#!/usr/bin/env node
// Repository gate (ADR-0004), run by `make verify`. Checks:
//   agent-symlinks  CLAUDE.md, GEMINI.md, .cursorrules and
//                   .github/copilot-instructions.md resolve to AGENTS.md;
//                   .claude/skills to .agents/skills (ADR-0002).
//   docs-index      every doc under docs/ (not TEMPLATE.md) is linked from
//                   docs/README.md, and every relative link there resolves.
//   risk-paths      the version 2 list covers the triage files at L1 or L2
//                   and the pr-triage job calls the local reusable workflow.
//   corrections     .memory/corrections/ passes scripts/check-corrections.mjs.
//   readme          root README.md passes the repository's rules R1 to R12.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRequiredPaths, parseStrictJson, validateRiskPaths } from "./lib/risk-paths.mjs";

const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
const usage = "Usage: node scripts/check-template.mjs [--root DIR]";
let root = resolve(scriptDir, "..");
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root") {
    if (i + 1 >= args.length || !args[i + 1] || args[i + 1].startsWith("--")) {
      console.error(usage);
      process.exit(2);
    }
    root = resolve(args[++i]);
  } else {
    console.error(usage);
    process.exit(2);
  }
}

const failures = [];
const counts = { docs: 0, links: 0, riskEntries: 0, corrections: "", readme: "" };

function failCheck(name, file, problem) {
  failures.push({ name, file, problem });
}

// a. Canonical instruction and skill symlinks.
function checkAgentSymlinks() {
  const agents = join(root, "AGENTS.md");
  let agentsReal;
  try {
    const stat = lstatSync(agents);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      failCheck("agent-symlinks", "AGENTS.md", "must be a regular file");
      return;
    }
    agentsReal = realpathSync(agents);
  } catch {
    failCheck("agent-symlinks", "AGENTS.md", "file does not exist");
    return;
  }

  const links = [
    ["CLAUDE.md", "AGENTS.md"],
    ["GEMINI.md", "AGENTS.md"],
    [".cursorrules", "AGENTS.md"],
    [".github/copilot-instructions.md", "AGENTS.md"],
  ];
  for (const [relative, _targetName] of links) {
    const file = join(root, relative);
    let stat;
    try {
      stat = lstatSync(file);
    } catch {
      failCheck("agent-symlinks", relative, "missing link");
      continue;
    }
    if (!stat.isSymbolicLink()) {
      failCheck("agent-symlinks", relative, "must be a symlink");
      continue;
    }
    try {
      if (realpathSync(file) !== agentsReal) {
        failCheck("agent-symlinks", relative, "symlink points to another file");
      }
    } catch {
      failCheck("agent-symlinks", relative, "broken link");
    }
  }

  const skillsLink = join(root, ".claude", "skills");
  const skillsDir = join(root, ".agents", "skills");
  try {
    if (!statSync(skillsDir).isDirectory()) {
      failCheck("agent-symlinks", ".agents/skills", "must be a directory");
    }
  } catch {
    failCheck("agent-symlinks", ".agents/skills", "directory does not exist");
  }

  let skillsStat;
  try {
    skillsStat = lstatSync(skillsLink);
  } catch {
    failCheck("agent-symlinks", ".claude/skills", "missing link");
  }
  if (skillsStat) {
    if (!skillsStat.isSymbolicLink()) {
      failCheck("agent-symlinks", ".claude/skills", "must be a symlink");
    } else {
      try {
        const skillReal = realpathSync(skillsDir);
        if (realpathSync(skillsLink) !== skillReal) {
          failCheck("agent-symlinks", ".claude/skills", "symlink points to another directory");
        }
      } catch {
        failCheck("agent-symlinks", ".claude/skills", "broken link");
      }
    }
  }
}

// b. Every Markdown document is indexed, and every docs index link resolves.
function markdownFiles(directory) {
  const found = [];
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...markdownFiles(file));
    else if (entry.isFile() && entry.name.endsWith(".md")) found.push(file);
  }
  return found;
}

function checkDocsIndex() {
  const docsDir = join(root, "docs");
  const indexFile = join(docsDir, "README.md");
  let indexText;
  if (!existsSync(indexFile)) {
    failCheck("docs-index", "docs/README.md", "file does not exist");
    return;
  }
  indexText = readFileSync(indexFile, "utf8");

  const relativeLinks = new Set();

  function addLinkTarget(rawTarget) {
    let target = rawTarget;
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(target) || target.startsWith("#")) return;
    target = target.split("#", 1)[0];
    if (!target) return;
    try {
      target = decodeURIComponent(target);
    } catch {
      failCheck("docs-index", "docs/README.md", `bad percent escape in link target ${rawTarget}`);
      return;
    }
    const resolved = resolve(docsDir, target);
    if (!existsSync(resolved)) {
      failCheck("docs-index", "docs/README.md", `link to missing path ${target}`);
    }
    relativeLinks.add(resolved);
    counts.links++;
  }

  const inlineLinkPattern = /\]\(\s*(?:<([^>\n]+)>|([^()\s]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)/g;
  for (const match of indexText.matchAll(inlineLinkPattern)) {
    addLinkTarget(match[1] ?? match[2]);
  }

  const referenceDefinitionPattern = /^ {0,3}\[[^\]\n]+\]:\s*(?:<([^>\n]+)>|(\S+))/gm;
  for (const match of indexText.matchAll(referenceDefinitionPattern)) {
    addLinkTarget(match[1] ?? match[2]);
  }

  for (const file of markdownFiles(docsDir)) {
    if (file === indexFile) continue;
    if (file.endsWith(`${sep}TEMPLATE.md`) || file.endsWith("/TEMPLATE.md")) continue;
    counts.docs++;
    if (!relativeLinks.has(file)) {
      const relative = file.slice(root.length + 1).split(sep).join("/");
      failCheck("docs-index", relative, "document is not linked from docs/README.md");
    }
  }
}

// c. Strict risk-path list at schema version 2 and a local triage workflow.
const CALLER_PATH = ".github/workflows/risk-paths.yml";
const TRIAGE_WORKFLOW = ".github/workflows/pr-triage.yml";
const TRIAGE_SCRIPT = "scripts/pr-triage.mjs";
const CALLER_JOB = "pr-triage";

// The lines of a workflow that are not part of a block scalar: a line under a
// `key: |` or `key: >` scalar is text a step runs, never a workflow key. The
// caller structure is small enough to read line by line, so the gate needs no
// YAML dependency.
function structureLines(text) {
  const lines = [];
  let blockIndent = -1;
  for (const raw of text.split(/\r?\n/u)) {
    const indent = raw.length - raw.trimStart().length;
    const blank = raw.trim() === "";
    if (blockIndent >= 0) {
      if (blank || indent > blockIndent) {
        lines.push({ text: raw, indent, inBlock: true });
        continue;
      }
      blockIndent = -1;
    }
    lines.push({ text: raw, indent, inBlock: false });
    if (blank) continue;
    const scalar = /^\s*(?:-\s+)?[\w.-]+:[ \t]+([|>][-+0-9]*)[ \t]*(?:#.*)?$/u.exec(raw);
    if (scalar) blockIndent = indent;
  }
  return lines;
}

// The value of a `uses:` key line, without a trailing comment.
function usesValue(text) {
  return text.trim().replace(/^uses:[ \t]*/u, "").replace(/[ \t]+#.*$/u, "").trim();
}

// The local reusable workflow must be the `uses:` key at indent 4 of pr-triage.
// A uses: line in another job, or the same text inside a run: block, is not the
// caller and must not pass.
function checkCaller(caller) {
  let text;
  try {
    text = readFileSync(join(root, caller), "utf8");
  } catch {
    failCheck("risk-paths", caller, "caller file does not exist");
    return;
  }
  const lines = structureLines(text);
  const jobsAt = lines.findIndex((line) => !line.inBlock && line.indent === 0 && /^jobs:[ \t]*(?:#.*)?$/u.test(line.text));
  if (jobsAt < 0) {
    failCheck("risk-paths", caller, `has no top-level jobs: key, so it has no job ${CALLER_JOB}`);
    return;
  }
  const jobAt = lines.findIndex((line, index) => index > jobsAt && !line.inBlock
    && line.indent === 2 && /^[^\s#][^:]*:[ \t]*(?:#.*)?$/u.test(line.text.trimStart())
    && line.text.trim().replace(/:.*$/u, "") === CALLER_JOB);
  if (jobAt < 0) {
    failCheck("risk-paths", caller, `must run the reusable workflow in the job ${CALLER_JOB}`);
    return;
  }
  let uses = null;
  for (let index = jobAt + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.inBlock) continue;
    const stripped = line.text.trim();
    // A comment-only line never ends a YAML mapping, whatever its indent.
    if (stripped === "" || stripped.startsWith("#")) continue;
    if (line.indent <= 2) break;
    if (line.indent === 4 && /^uses:/u.test(stripped)) {
      uses = usesValue(stripped);
      break;
    }
  }
  if (uses === null) {
    failCheck(
      "risk-paths",
      caller,
      `the job ${CALLER_JOB} must set uses: at 4 spaces to ./${TRIAGE_WORKFLOW}; a uses: line in another job or in a run: block does not count`,
    );
    return;
  }
  if (uses !== `./${TRIAGE_WORKFLOW}`) {
    failCheck(
      "risk-paths",
      caller,
      `the uses: of the job ${CALLER_JOB} must be ./${TRIAGE_WORKFLOW}, not ${JSON.stringify(uses)}`,
    );
  }
}

function checkRiskPaths() {
  const relative = ".github/risk-paths.json";
  const absolute = join(root, relative);
  if (!existsSync(absolute)) {
    failCheck("risk-paths", relative, "file does not exist");
    return;
  }

  let list;
  try {
    list = parseStrictJson(readFileSync(absolute, "utf8"));
  } catch (error) {
    failCheck("risk-paths", relative, error.message);
    return;
  }

  const validation = validateRiskPaths(list);
  if (!validation.ok) {
    for (const error of validation.errors) {
      failCheck("risk-paths", relative, error);
    }
    return;
  }

  if (list.schema_version !== 2) {
    failCheck("risk-paths", relative, `schema_version: must be 2, not ${JSON.stringify(list.schema_version)}`);
  }

  checkCaller(CALLER_PATH);
  for (const file of [TRIAGE_WORKFLOW, TRIAGE_SCRIPT]) {
    if (!existsSync(join(root, file)) || !statSync(join(root, file)).isFile()) {
      failCheck("risk-paths", file, "local triage file does not exist");
    }
  }
  counts.riskEntries = list.paths.length;
  for (const error of checkRequiredPaths(list, [relative, CALLER_PATH, TRIAGE_WORKFLOW, TRIAGE_SCRIPT])) {
    failCheck("risk-paths", relative, error);
  }
}

// d. Run the corrections child process from the same scripts folder.
function checkCorrections() {
  const script = join(scriptDir, "check-corrections.mjs");
  try {
    const output = execFileSync(process.execPath, [script, "--root", root], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    counts.corrections = output.replace(/^ok\s+corrections:\s*/, "");
  } catch (error) {
    const stdout = String(error.stdout || "").trim();
    const stderr = String(error.stderr || "").trim();
    const output = [stderr, stdout].filter(Boolean).join("\n");
    if (output) {
      for (const line of output.split("\n")) {
        if (line.startsWith("FAIL corrections:")) {
          failCheck("corrections", ".memory/corrections/", line.replace(/^FAIL corrections:\s*/, ""));
        } else {
          failCheck("corrections", ".memory/corrections/", line);
        }
      }
    } else {
      failCheck("corrections", ".memory/corrections/", `child process exited ${error.status ?? 1}`);
    }
  }
}

// e. Run the repository's README checker.
function checkReadme() {
  try {
    counts.readme = execFileSync(process.execPath, [join(scriptDir, "lib", "check-readme.mjs"), root], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim().replace(/^ok\s+/, "");
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    for (const line of (output || `child process exited ${error.status ?? 1}`).split("\n")) {
      failCheck("readme", "README.md", line);
    }
  }
}

checkAgentSymlinks();
checkDocsIndex();
checkRiskPaths();
checkCorrections();
checkReadme();

if (failures.length > 0) {
  for (const failure of failures) {
    console.log(`FAIL ${failure.name}: ${failure.file}: ${failure.problem}`);
  }
  process.exit(1);
}

console.log("ok   agent-symlinks: 5 symlinks resolve to AGENTS.md and .agents/skills");
console.log(`ok   docs-index: ${counts.docs} docs indexed, ${counts.links} index links resolve`);
console.log(`ok   risk-paths: ${counts.riskEntries} entries at schema version 2, local triage files covered`);
console.log(`ok   corrections: ${counts.corrections}`);
console.log(`ok   readme: ${counts.readme}`);
