# Fabryka

Fabryka is a software factory for our team. Start at
[docs/README.md](docs/README.md).

This file (`AGENTS.md`) is the CANONICAL agent instructions — `CLAUDE.md`,
`GEMINI.md`, `.cursorrules`, and `.github/copilot-instructions.md` are symlinks
to it, and `.claude/skills` symlinks to `.agents/skills/`
([ADR-0002](docs/adr/0002-agent-portable-instruction-surface.md)). Edit only
the canonical paths; keep content tool-agnostic.

## Skills (follow these for common tasks)

Step-by-step procedures live in [.agents/skills/](.agents/skills/); follow
them rather than improvising, whichever agent you are:

<!-- One bullet per skill: **When to use it** → [.agents/skills/<name>/SKILL.md].
Add a skill whenever you find yourself re-explaining a multi-step procedure.
Start from .agents/skills/TEMPLATE/SKILL.md. -->

- *(none yet — add the first one when a procedure repeats)*

## Code conventions

- Use [Conventional Commits](docs/adr/0005-require-conventional-commits.md)
  for every commit message you author, including squash commits. Write
  `type(scope): description` with an optional scope, e.g.
  `docs(adr): require conventional commits`. Use `feat` for features and
  `fix` for bug fixes. Mark breaking changes with `!` before the colon or a
  `BREAKING CHANGE:` footer. Leave Git-generated merge messages and existing
  history alone.
- Run `make verify` before you call any change done. CI job `verify` runs
  `make ci`; with `BASE` set to the PR base it also checks corrections
  records: no record removed or renamed, only an empty `promoted_to`
  filled, and the old corrections file does not come back. Run
  `make ci BASE=origin/main` for the same check locally.
- A doc that says what a gate refuses names the command, the condition it
  runs under (for example `make ci BASE=<ref>`, not `make ci`) and each change
  the gate allows (for example a filled empty `promoted_to`), as the
  `Makefile`, the workflow and the gate's code define them.
- `mise.toml` and `mise.lock` pin the gate's Node.js version;
  run `mise install` to get it. Change a pin only with `mise lock`,
  in a commit of its own.

**Test reliability.** No sleeps for timing (wait on a condition or inject a
clock). No network and no wall clock in unit tests (inject them). A flaky test
gets an issue, then a fix or a quarantine (skip with the issue link) in the
same PR. Never retry a job or a test until it is green.

**Blocker to guard.** When a review (agent cross-review, owner review, or a
human) finds a blocking point, the PR that fixes it also adds a guard: a
targeted test that fails without the fix (preferred), or an `AGENTS.md` rule
when no test can catch it. The same PR adds 1 record file under
`.memory/corrections/` (name `<date>-pr-<N>-<words>.json`; `evidence`: the PR
and the review; `promoted_to`: the test or the rule). See `.memory/README.md`.

**Risk paths.** `.github/risk-paths.json` is a level list (schema version 2):
every glob carries a level, and a PR that touches one gets that level label from
`.github/workflows/risk-paths.yml` (`level:L1` read every line, `level:L2` read
the diff, `level:L3` skim, `level:L4` title and CI), plus `risk:high` at L1 and
L2, which declares tier 3. [PR triage](docs/specs/pr-triage.md) combines the
matched globs, `default_level` and the repository review floors; it never
lowers an existing level. It removes `ready-for-human` when the head moves or
if the label is added before CI is green. Add a path for signing, auth,
publishing, secrets, destructive operations or CI files, with a `why` that
names its category. The gate requires schema version 2.

**Local policy.** [ADR-0004](docs/adr/0004-own-the-repository-baseline.md)
defines the baseline. Maintain the README, risk-path and corrections checks
here and update their tests when behavior changes.

## Repository boundary

Do not commit credentials or other secrets. Use private reporting for
vulnerabilities (see [SECURITY.md](SECURITY.md)).

## Documentation rules (enforced)

Docs live in `docs/` in four categories. **Every new doc starts from its
category's `TEMPLATE.md`** and follows its structure:

- `docs/adr/` — why we decided. Immutable once Accepted; reversals are new
  ADRs that mark the old one Superseded. Record new repository decisions here.
- `docs/design/` — how it fits together. Living; updated in place to match
  reality.
- `docs/specs/` — exact contracts. Change only alongside implementing code.
- `docs/plans/` — order of work. Phases with "Done when" outcomes.

### Cross-linking is mandatory

A doc without its required links is incomplete — do not finish a docs change
until they exist, in both directions:

- **ADR** → links every design doc/spec it shapes, and prior ADRs it builds on.
- **Design doc** → links the ADR(s) providing its rationale, the spec(s)
  pinning its contracts, and the roadmap phase that builds it.
- **Spec** → links its motivating ADR(s) and the design doc showing where it
  fits.
- **Plan** → every phase links the design docs/specs it implements; resolved
  open questions become ADRs.

When you touch a doc, verify its links still hold (targets exist, section
anchors valid) and add the back-links on the targets. Use relative paths.

### Housekeeping

- New doc ⇒ add a line to the index in [docs/README.md](docs/README.md).
- New significant decision ⇒ new ADR *first*, then update the affected design
  docs/specs in the same change.
- Convert relative dates ("next weekend") to absolute dates in all docs.
