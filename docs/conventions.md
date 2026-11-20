# Fabryka contributor conventions

This guide describes what Fabryka's repository template gives your team,
what it asks you to do, and which rules GitHub or local checks actually
enforce. The foundation is ready to use; it does not yet include application
code, a release pipeline, or a separately deployed documentation site.

## Overview

Most contributions follow the same path:

1. Branch from the latest base. Install the pinned tools with `mise install`.
   If you use an agent, have it read [AGENTS.md](../AGENTS.md).
2. Make the change and update the relevant docs or tests. Record a
   significant decision in an ADR rather than burying it in a PR discussion.
3. Run `make verify`. Use `make ci BASE=origin/main` to also check correction
   history against the current remote-tracking `main`.
4. Use a Conventional Commit subject and open a PR. Explain the change,
   declare the risk tier, and include the commands you ran and their results.
5. Address review feedback. When a reviewer finds a blocker, add a guard
   against recurrence and a correction record in the same PR.

## Design

### One set of agent instructions and skills

[AGENTS.md](../AGENTS.md) is the source of truth for repository instructions.
`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, and
`.github/copilot-instructions.md` are symlinks to it. Edit the canonical file,
not the aliases. Keep the guidance tool-agnostic so humans and agents using
different tools work from the same rules.

For a procedure people keep re-explaining to agents, start from the
[skill template](../.agents/skills/TEMPLATE/SKILL.md). Put the procedure in
`.agents/skills/<name>/SKILL.md`, give it a description that says when to use
it, and register it in `AGENTS.md`. `.claude/skills` points to the same
directory. There are no project-specific skills yet. This setup avoids
duplicated instructions, but it does require a checkout that supports
symlinks. On Windows, enable `core.symlinks=true` when cloning or use WSL.
GitHub showing a link's target path instead of its contents is normal.

### Documentation and decisions

Use the [documentation index](README.md) to find and add docs. Start each
new ADR, design, spec, or plan from that category's template.

| Doc type | What belongs there | What that buys you |
| --- | --- | --- |
| [ADR](adr/TEMPLATE.md) | The facts, rationale, and consequences of a significant decision. Use the next number. Once accepted, keep the decision intact; write a new ADR and mark the old one superseded if you reverse it. | Future contributors can see why a choice was made without reconstructing the conversation. |
| [Design](design/TEMPLATE.md) | How the system fits together now. Update it in place as the implementation changes. | A current map of the system, separate from the history of decisions. |
| [Spec](specs/TEMPLATE.md) | The precise, testable contract. Change it alongside the implementation. | Reviewers can distinguish intentional contract changes from regressions. |
| [Plan](plans/TEMPLATE.md) | The order of work, in phases with observable “Done when” outcomes. | Contributors know what each phase delivers and how to tell when it is finished. |

Add new docs to the index and link related docs in both directions. For
example, a design links the ADR that motivated it and the spec that defines
its contract; both link back to the design. Link the relevant plan phase
when one exists. Use relative links and check their targets and anchors.
Use absolute dates, not phrases that go stale such as “next week.”

The [root README](../README.md) is the front door: purpose, status, docs,
development commands, and links to key repository files. Its checker
enforces a standard layout, including the project-kind marker and expected
headings. It does not impose that layout on subdirectory READMEs. Keep
operating detail in `docs/` so the README stays useful to a first-time reader.

### Commit messages and the pull request

[ADR-0005](adr/0005-require-conventional-commits.md) requires Conventional
Commits for authored messages, including squash commits. Use
`type(scope): description` with an optional scope, such as
`fix(ci): preserve the base ref` or `docs: explain repository setup`.
Use `feat` for a new feature and `fix` for a bug fix. Mark a breaking
change with `!` before the colon or a `BREAKING CHANGE:` footer. Existing
history and unedited Git-generated merge commits are exempt. The format
makes history easier to scan and gives future changelog tools usable input;
it is a contributor rule, not a CI check.

The [PR template](../.github/pull_request_template.md) asks for intent,
risk, documentation changes, and verification evidence. Fill in the
highest applicable risk tier: **1** for low-risk work such as docs, tests,
and comments; **2** for code behavior changes; **3** for changes involving
security, data loss, releases or publishing, CI and permissions, or any PR
marked `risk:high`. The tier is the author's declaration; path-based labels
are separate and can raise what review requires.

### Risk-based review and readiness

The [triage workflow](../.github/workflows/risk-paths.yml) compares PR paths
against [the risk configuration](../.github/risk-paths.json). The strictest
matching glob wins for each file; unmatched paths start at `default_level`
(currently L3). Repository review floors can make a level stricter, as with
sensitive filenames and workflow or policy paths. The most sensitive file
sets the PR level. Renames count by both names; at GitHub's 3,000-file API
limit, the workflow uses L1 rather than trusting an incomplete list.

| Label | What to do in review |
| --- | --- |
| `level:L1` | Read every line. In the PR body, list the high-risk paths and explain why the change is safe. |
| `level:L2` | Read the diff. |
| `level:L3` | Skim the change. |
| `level:L4` | Check the title and CI. |

L1 and L2 also receive `risk:high`, which means tier 3 and repository owner
review under the contribution policy. Triage does not lower a level or
remove `risk:high` automatically. Add an explicit glob, level, and `why`
when introducing files for signing, authentication, publishing, secrets,
destructive operations, or CI. This puts review time where errors are most
costly and makes policy changes reviewable in Git.

Use `ready-for-human` once the current head has a successful GitHub Actions
`verify` check and its other checks and statuses are green. Triage removes
the label if it is applied before CI is green or if a new commit moves the
head. The label is not an approval and does not authorize or automate a
merge. See the [PR triage spec](specs/pr-triage.md) for exact behavior.

### Corrections and regression guards

When a reviewer finds a blocker, fix it and add a focused test that fails
without the fix. If a test cannot catch it, add an `AGENTS.md` rule. Record
the lesson and its evidence in one canonical JSON file under
[`.memory/corrections/`](../.memory/README.md), using the documented naming
and field order. Separate files reduce merge conflicts; linking the lesson
to a guard makes it useful after the original PR is forgotten. Do not put
credentials or non-public vulnerability details in the inbox.

## Operational notes

### Local verification and CI

`mise.toml` and `mise.lock` pin Node.js and record its checksums. Install the
pinned version with `mise install` for parity with GitHub Actions. The local
gate needs Node.js 22 or later and `make`, with no third-party Node packages
to install. Change tool pins with `mise lock` in a dedicated commit so the
toolchain change can be reviewed on its own.

| Command | What it checks |
| --- | --- |
| `make verify` | Canonical instruction and skill symlinks; documentation index and its link targets; risk-path schema, required path coverage and local triage wiring; correction file format; root README; and the Node.js test suite, including design-to-ADR backlinks. |
| `make check` | The same gate as `make verify`. |
| `make ci` | The same gate. With `BASE=<ref>` set, it also compares correction records against that base: no removal, rename, or edit except filling an empty `promoted_to`; the old single file cannot return if the base has the corrections folder. |

The [CI workflow](../.github/workflows/ci.yml) runs `make ci` for PRs,
pushes to `main`, and merge groups, supplying the base SHA for PRs and
merge groups. It uses the same checks you can run before pushing. If a
unit test needs time or a service response, inject a clock or a fake
instead of sleeping, using the system clock, or calling the network.
File an issue for a flaky test, then fix or quarantine it with the issue
link in the same PR. A rerun that happens to pass is not a fix.

### GitHub settings and workflow security

Repository settings do not travel with a checkout. When adopting the
template in another repository, have an administrator follow the
[GitHub setup guide](new-repository.md):

- **Create the six triage labels.** Missing `risk:high` fails triage.
  If a level label is missing, triage warns and leaves level labels alone.
- **Protect the default branch.** The ruleset requires a PR and the `verify`
  check and blocks deletion and force pushes, with an admin bypass. Owner
  review for `risk:high` is repository policy; the documented ruleset does
  not require an approving review.
- **Enable private vulnerability reporting.** Use the GitHub Security tab,
  not a public issue. [SECURITY.md](../SECURITY.md) explains what to send and
  which branch receives fixes. Do not commit credentials.

Workflows pin external actions to full commit SHAs and annotate them with
versions. They start with no token permissions, grant only what each job
needs, and disable persistent checkout credentials. The triage job needs
permission to change labels, so it checks out and executes only trusted
base-branch code; it reads PR data through the GitHub API. Keep that
separation when you change the workflow: the code a contributor submits
must not run in the job that can write to their PR.

[Dependabot](../.github/dependabot.yml) checks GitHub Actions weekly and
groups version updates into one PR per ecosystem per run. Security updates
stay separate. Add an ecosystem entry when you add a supported manifest.
This keeps routine review volume down without bundling security fixes into
routine updates. Updates still go through normal review and CI.

The source is [MIT-licensed](../LICENSE). If you redistribute it, retain
the copyright and permission notice as the license requires.

## References

- [Repository baseline (ADR-0004)](adr/0004-own-the-repository-baseline.md)
- [Agent-ready repository design](design/agent-ready-repository.md)
- [PR triage contract](specs/pr-triage.md)
- [GitHub setup guide](new-repository.md)
