import assert from "node:assert/strict";
import { test } from "node:test";
import { triage } from "../scripts/pr-triage.mjs";

const ready = "ready-for-human";
const head = "b".repeat(40);
const passing = { id: 2, app: { id: 15368, slug: "github-actions" }, name: "verify",
  status: "completed", conclusion: "success" };

function fixture({ action = "opened", labels = [], files = ["README.md"], runs = [], statuses = [], missing = [] } = {}) {
  const event = {
    repository: { owner: { login: "future-owner" }, name: "fabryka" },
    action,
    before: "a".repeat(40),
    label: { name: ready },
    pull_request: { number: 42, head: { sha: head }, base: { sha: "c".repeat(40) },
      labels: labels.map((name) => ({ name })) },
  };
  const live = { ...event.pull_request, state: "open" };
  const current = new Set(labels);
  const writes = [];
  const reports = [];
  const target = ["future-owner", "fabryka", 42];
  const api = {
    getPullRequest: async (...args) => {
      assert.deepEqual(args, target);
      return live;
    },
    listPullFiles: async () => files,
    labelExists: async (_owner, _repo, name) => !missing.includes(name),
    listIssueLabels: async () => [...current].map((name) => ({ name })),
    listCheckRuns: async (_owner, _repo, sha) => {
      assert.equal(sha, head);
      return runs;
    },
    listCommitStatuses: async () => statuses,
    addLabels: async (...args) => {
      assert.deepEqual(args.slice(0, -1), target);
      writes.push(["add", ...args.at(-1)]);
      for (const name of args.at(-1)) current.add(name);
    },
    removeIssueLabel: async (...args) => {
      assert.deepEqual(args.slice(0, -1), target);
      writes.push(["remove", args.at(-1)]);
      return current.delete(args.at(-1));
    },
  };
  const list = { schema_version: 2, default_level: "L3",
    paths: [{ glob: "scripts/pr-triage.mjs", level: "L2", why: "governance: triage" }] };
  return { live, current, writes, reports, run: () => triage({ api, event, list, report: (text) => reports.push(text) }) };
}

test("triage uses the old name of a rename and raises an existing level", async () => {
  const f = fixture({ labels: ["level:L3"], files: [{ filename: "notes.md", previous_filename: "secrets.md" }] });
  await f.run();
  assert.deepEqual(f.writes, [["add", "level:L1", "risk:high"], ["remove", "level:L3"]]);
});

test("triage keeps a stricter existing level and ensures it has the high-risk label", async () => {
  const f = fixture({ labels: ["level:L2"] });
  await f.run();
  assert.deepEqual(f.writes, [["add", "risk:high"]]);
  await f.run();
  assert.deepEqual(f.writes, [["add", "risk:high"]]);
});

test("triage warns about a missing level label without creating it", async () => {
  const f = fixture({ files: [".github/workflows/ci.yml"], missing: ["level:L2"] });
  await f.run();
  assert.deepEqual(f.writes, [["add", "risk:high"]]);
  assert.match(f.reports.join("\n"), /missing repository labels level:L2/);
});

test("ready-for-human is removed on a new head, but not by an outdated event", async () => {
  const f = fixture({ action: "synchronize", labels: [ready, "level:L3"] });
  f.live.head = { sha: "d".repeat(40) };
  await f.run();
  assert.deepEqual(f.writes, []);
  f.live.head = { sha: head };
  await f.run();
  assert.deepEqual(f.writes, [["remove", ready]]);
});

test("readiness requires green CI and uses the latest run of a check", async () => {
  for (const { runs, statuses, keep } of [
    { runs: [], keep: false },
    { runs: [{ ...passing, status: "in_progress", conclusion: null }], keep: false },
    { runs: [passing], statuses: [{ state: "failure" }], keep: false },
    { runs: [passing, { ...passing, id: 1, conclusion: "failure" }], keep: true },
  ]) {
    const f = fixture({ action: "labeled", labels: [ready, "level:L3"], runs, statuses });
    await f.run();
    assert.equal(f.current.has(ready), keep);
  }
});
