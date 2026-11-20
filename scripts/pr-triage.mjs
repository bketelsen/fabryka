import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  createGitHubApi, LABEL, LEVELS, levelOfPullRequest, LIST_PATH, parseStrictJson, validateRiskPaths,
} from "./lib/risk-paths.mjs";

const ready = "ready-for-human";
const levelLabel = (level) => `level:${level}`;
const sha = /^[a-f0-9]{40}$/;
const green = new Set(["success", "neutral", "skipped"]);

function isGreen(runs, statuses) {
  const latest = new Map();
  for (const run of runs) {
    if (run.name.startsWith("pr-triage")) continue;
    const key = JSON.stringify([run.app?.id, run.name]);
    if (!latest.has(key) || run.id > latest.get(key).id) latest.set(key, run);
  }
  const checks = [...latest.values()];
  return checks.some((run) => run.name === "verify" && run.app?.slug === "github-actions"
    && run.conclusion === "success")
    && checks.every((run) => run.status === "completed" && green.has(run.conclusion))
    && statuses.every((status) => status.state === "success");
}

export async function triage({ api, event, list, report }) {
  const owner = event.repository?.owner?.login;
  const repo = event.repository?.name;
  const pr = event.pull_request;
  if (!owner || !repo || !Number.isSafeInteger(pr?.number) || pr.number < 1
    || !sha.test(pr.head?.sha ?? "") || !sha.test(pr.base?.sha ?? "")) {
    throw new Error("Missing repository, PR number or commit SHAs in triage event.");
  }
  const validation = validateRiskPaths(list);
  if (!validation.ok) throw new Error(`${LIST_PATH}: ${validation.errors.join("; ")}`);
  if (list.schema_version !== 2) throw new Error(`${LIST_PATH}: schema_version must be 2.`);

  const args = [owner, repo, pr.number];
  const current = async () => {
    const live = await api.getPullRequest(...args);
    return live.state === "open" && live.head?.sha === pr.head.sha && live.base?.sha === pr.base.sha;
  };
  if (!(await current())) {
    report("Skipped stale or closed pull request.");
    return;
  }

  const pushed = event.action === "synchronize" && event.before !== pr.head.sha
    && pr.labels?.some((label) => label.name === ready);
  const labeled = event.action === "labeled" && event.label?.name === ready;
  const notGreen = labeled && !isGreen(
    await api.listCheckRuns(owner, repo, pr.head.sha),
    await api.listCommitStatuses(owner, repo, pr.head.sha),
  );
  if ((pushed || notGreen) && await current() && await api.removeIssueLabel(...args, ready)) {
    report(`Removed \`${ready}\`: ${pushed ? "the head moved" : "CI is not green at the head"}.`);
  }

  const files = await api.listPullFiles(...args);
  const { level, truncated } = levelOfPullRequest(list, files);
  const names = [LABEL, ...LEVELS.map(levelLabel)];
  const missing = (await Promise.all(names.map(async (name) =>
    await api.labelExists(owner, repo, name) ? null : name))).filter(Boolean);
  if (missing.includes(LABEL)) throw new Error(`Create the ${LABEL} label before running PR triage.`);

  const labels = new Set((await api.listIssueLabels(...args)).map((label) => label.name));
  const rank = LEVELS.indexOf(level);
  const effective = LEVELS.find((candidate, index) => index === rank || labels.has(levelLabel(candidate)));
  if (!(await current())) {
    report("Skipped level changes because the pull request changed during triage.");
    return;
  }
  const finalLevel = levelLabel(effective);
  const toAdd = [];
  if (missing.length === 0 && !labels.has(finalLevel)) toAdd.push(finalLevel);
  if ((effective === "L1" || effective === "L2") && !labels.has(LABEL)) toAdd.push(LABEL);
  if (toAdd.length > 0) await api.addLabels(...args, toAdd);
  if (missing.length === 0) {
    for (const lower of LEVELS.slice(LEVELS.indexOf(effective) + 1).map(levelLabel)) {
      if (labels.has(lower)) await api.removeIssueLabel(...args, lower);
    }
  } else {
    report(`Warning: missing repository labels ${missing.join(", ")}; no level label changed.`);
  }
  report(`Computed ${level}${truncated ? " (changed-file list reached the GitHub API limit)" : ""}; effective level ${effective}.`);
}

async function main(env) {
  if (env.GITHUB_EVENT_NAME !== "pull_request_target") {
    throw new Error("PR triage must run on pull_request_target.");
  }
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  const list = parseStrictJson(readFileSync(LIST_PATH, "utf8"));
  const api = createGitHubApi({ token: env.GITHUB_TOKEN, apiUrl: env.GITHUB_API_URL, fetch });
  await triage({
    api, event, list,
    report(message) {
      console.log(message);
      if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
    },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.env);
}
