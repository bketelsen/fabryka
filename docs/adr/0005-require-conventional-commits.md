# 0005 — Require Conventional Commits

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

People and coding agents both write Fabryka commits. A shared format makes
the intent of each change clear in Git history and leaves that history usable
by tools that generate changelogs.

## Decision

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
for all new commit messages authored by contributors and agents, including
squash commit messages. Write the subject as `type(scope)!: description`,
omitting the scope and `!` when they do not apply. Use `feat` for a new feature,
`fix` for a bug fix, and a type that describes the change for other work, such
as `docs`, `test`, or `ci`.

Mark breaking changes with `!` before the colon or a `BREAKING CHANGE:`
footer explaining the incompatibility. Unedited Git-generated merge commits
are exempt. Existing commits are not rewritten.

## Consequences

- Reviewers can identify the intent of a change from its commit subject.
- Contributors and agents must choose a type and flag breaking changes.
  The requirement is a contributor rule, not a CI check.

## Alternatives considered

- **Free-form subjects:** flexible, but the history has no consistent way to
  distinguish features, fixes, and breaking changes.

## References

- Builds on: [ADR-0004](0004-own-the-repository-baseline.md)
- Shapes: [agent instructions](../../AGENTS.md), [agent-ready repository](../design/agent-ready-repository.md)
