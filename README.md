<!-- readme-kind: infrastructure -->
# Fabryka

Fabryka is a software factory for our team. Its goal is to make the way we build and maintain software repeatable, with shared workflows and reviewable automation.

**Status:** pre-release. The repository foundation is in place; factory functionality and releases have not landed yet.

**Documentation:** [docs/README.md](docs/README.md)

## What is here

| Path | What it is |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md` | Canonical agent instructions and tool-facing symlinks |
| `.agents/skills/`, `.claude/skills` | Canonical shared skills and the Claude skills symlink |
| `docs/` | ADRs, designs, specs, plans and documentation indexes |
| `Makefile` | The verify, check and CI gate |
| `mise.toml`, `mise.lock` | Pinned tool versions |
| `scripts/` | Verification checks and pull request triage |
| `test/` | Node.js fixtures and gate tests |
| `.memory/` | The corrections inbox: 1 file per record in `.memory/corrections/` |
| `.github/` | Risk paths, dependabot settings, pull request guidance and workflows |
| `LICENSE`, `SECURITY.md` | License text and private vulnerability reporting |

## Use

Start with the [contributor conventions](docs/conventions.md) for a tour of
the repository and what it expects from contributors, or [AGENTS.md](AGENTS.md)
for the canonical agent instructions. Repository administrators can configure
labels, the default-branch ruleset and private vulnerability reporting with
the [repository setup guide](docs/new-repository.md).

## How it works

The repository keeps one canonical set of agent instructions and records
significant decisions in local ADRs. CI runs the same verification gate
contributors run locally. [Agent-ready repository](docs/design/agent-ready-repository.md)
explains how the checks, pull request triage and corrections fit together.

## Develop

```sh
mise install
make verify
```

`make verify` needs only Node.js 22 or later and `make`; it uses no package manager and no third-party dependency. Clone with `core.symlinks=true` on Windows.

## Where to go next

- [AGENTS.md](AGENTS.md): the rules for agents and contributors.
- [docs/README.md](docs/README.md): the index of decisions, designs, specs and plans.
- [SECURITY.md](SECURITY.md): report a vulnerability privately.
- [LICENSE](LICENSE): MIT.
