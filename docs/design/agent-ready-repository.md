# Agent-ready repository

Living document. Rationale: [ADR-0001](../adr/0001-record-architecture-decisions.md),
[ADR-0002](../adr/0002-agent-portable-instruction-surface.md),
[ADR-0004](../adr/0004-own-the-repository-baseline.md) and
[ADR-0005](../adr/0005-require-conventional-commits.md).
Contract: [PR triage](../specs/pr-triage.md).

## Overview

Fabryka is a software factory for our team. Its repository foundation gives
contributors and coding agents one place to find instructions, project
decisions, repeatable checks and lessons from reviews.

## Design

Agents succeed when the repository answers their questions before they ask:

- **One law, every agent.** `AGENTS.md` is the canonical instruction file; `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, and `.github/copilot-instructions.md` are symlinks to it, so Claude Code, Copilot, Gemini, Cursor, and whatever comes next all read the same rules. Skills live once in `.agents/skills/` (`.claude/skills` is a symlink). No drift, ever.
- **Docs split by the question they answer.** `docs/adr/` (why — immutable), `docs/design/` (how — living), `docs/specs/` (what exactly — testable contracts), `docs/plans/` (when — phases with "Done when" outcomes). An agent that needs rationale, mechanism, contract, or sequence knows exactly where to look — and where to write.
- **Templates as enforcement.** Every category has a `TEMPLATE.md`; every new doc starts from it. Structure you don't have to think about is structure that stays consistent.
- **Mandatory cross-linking.** ADRs link the designs they shape; designs link their ADRs, specs, and roadmap phase; specs link back. A doc without its links is defined as incomplete, so the graph stays navigable from any entry point.
- **Live conventions only.** AGENTS.md's code-conventions section describes the code *as it is* — rules graduate in when the enforcing code lands. Agents following stale rules produce broken work; this structure makes stale rules a category error.
- **Skills over improvisation.** Multi-step procedures that repeat become `.agents/skills/<name>/SKILL.md` files with a frontmatter description agents can select on. Explaining a procedure twice means it should become a skill.
- **Consistent commit history.** Contributors and agents use Conventional Commits for authored commit messages. The rule lives in `AGENTS.md`, not in the CI gate.
- **A verify gate protects the repository.** `make verify` checks the canonical surfaces, documentation index, risk paths, corrections inbox and root README. PR triage labels changes using repo-owned policy; the corrections inbox turns blocking reviews into guards.

**Layout.** The repository foundation contains:

| Path | What it is |
| --- | --- |
| `AGENTS.md` | Canonical agent instructions (the law) |
| `CLAUDE.md` → `AGENTS.md` | Symlink for Claude Code |
| `GEMINI.md` → `AGENTS.md` | Symlink for Gemini CLI |
| `.cursorrules` → `AGENTS.md` | Symlink for Cursor |
| `.github/copilot-instructions.md` → `AGENTS.md` | Symlink for Copilot |
| `.agents/skills/` | Canonical skills; `TEMPLATE/SKILL.md` copies for new skills |
| `.claude/skills` → `.agents/skills` | Symlink |
| `docs/README.md` | Taxonomy and index; every doc gets a line |
| `docs/adr/` | Immutable decisions; why; also `TEMPLATE.md` |
| `docs/design/` | Living architecture documents; how; also `TEMPLATE.md` |
| `docs/specs/` | Testable contracts; what; also `TEMPLATE.md` |
| `docs/plans/` | Phased plans; when; also `TEMPLATE.md` |
| `Makefile` | Verify, check and CI triad |
| `mise.toml`, `mise.lock` | Tool pins; `mise install` provisions them |
| `LICENSE` | MIT license text |
| `SECURITY.md` | Private vulnerability reporting |
| `scripts/lib/risk-paths.mjs` | Risk-path validator, matcher and levels |
| `scripts/lib/check-readme.mjs` | Root README checker |
| `scripts/check-template.mjs` | Repository verification entry point |
| `scripts/check-corrections.mjs` | Corrections gate: 1 file for each record |
| `scripts/pr-triage.mjs` | Applies labels to pull requests |
| `test/` | Node.js test fixtures and gate tests |
| `.memory/` | Corrections inbox: 1 file for each record in `.memory/corrections/` |
| `.github/risk-paths.json` | High-risk repository paths, with a level for each |
| `.github/dependabot.yml` | Dependency update configuration |
| `.github/pull_request_template.md` | Risk tier and verification checklist |
| `.github/workflows/` | CI and repository-local PR triage workflows |

## Operational notes

`mise install` provisions the pinned Node.js. `make verify` needs only Node.js 22 or later and `make`; it uses no package manager, `package.json`, install step or third-party dependency. Symlinks require Linux or macOS, or `core.symlinks=true` on Windows. GitHub's web renderer shows a symlink as its target path; this is cosmetic only.

`make verify` (also run by `make check` and `make ci`) checks root `README.md`
with `scripts/lib/check-readme.mjs`. Failures include the rule ID and message.
Subdirectory READMEs are outside this check.

CI runs the repository checks. `make ci BASE=<ref>` also compares corrections
against the given base: records cannot be removed, renamed or edited except
to fill an empty `promoted_to`, and the old single file cannot return when the
base has the corrections folder. Blocking reviews become targeted tests or
`AGENTS.md` rules with a corrections record file. See
[repository setup](../new-repository.md) for the corresponding GitHub settings.

## References

- Rationale: [ADR-0001](../adr/0001-record-architecture-decisions.md), [ADR-0002](../adr/0002-agent-portable-instruction-surface.md), [ADR-0004](../adr/0004-own-the-repository-baseline.md), [ADR-0005](../adr/0005-require-conventional-commits.md)
- Contract: [PR triage](../specs/pr-triage.md)
