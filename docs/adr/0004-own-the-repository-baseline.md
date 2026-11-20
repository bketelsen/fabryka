# 0004 — Own the repository baseline

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

Fabryka is a software factory for our team. Its repository conventions and
automation need to work independently of the template's source organization
and of Fabryka's eventual GitHub owner.

## Decision

- Fabryka records significant decisions in this repository's ADRs. Keep ADRs
  factual and immutable after acceptance, and keep `docs/` organized into
  ADRs, designs, specs and plans with templates and reciprocal links. Keep
  agent instructions and skills canonical, with tool-facing symlinks.
- Keep `make verify`, `make check` and `make ci`. Pin gate tooling in mise and
  use the same pinned Node.js locally and in CI. The README, risk-path and
  corrections checks are maintained and tested here, not pinned to copies
  from another repository.
- Require the `verify` job on the default branch and enable private
  vulnerability reporting. Pin external actions to full commit SHAs with
  version comments, start workflows with no token permissions, grant only the
  job's required permissions and do not persist checkout credentials.
- Declare a risk tier in each pull request. Run PR triage from trusted base
  code. Use the repository's risk config and floors to assign levels without
  lowering an existing level; L1 and L2 require tier 3 and owner review.
  `ready-for-human` applies only to a head with green CI. Triage neither merges
  pull requests nor simulates automerge for dependency updates.
- Keep corrections in one canonical file per record. The PR that fixes a
  blocking review adds a regression test (or an `AGENTS.md` rule if a test is
  infeasible) and a correction. With `BASE` set, CI checks that the records
  remain append-only except for filling an empty `promoted_to`.
- Keep the MIT license and a project README that states purpose, status and
  documentation. Use one Dependabot version-update group per configured
  ecosystem; do not group security updates. Add ecosystem entries when their
  manifests exist. Do not prescribe release tooling, a docs-site stack or
  ownership rules before Fabryka needs them.

## Consequences

- Fabryka owns changes to policy, scripts and workflow behavior in one place.
- The default-branch ruleset, PR labels and private vulnerability reporting
  are GitHub settings and must be configured separately from the checkout.
- Existing corrections remain historical records, not active policy.

## Alternatives considered

- **Keep external policy references and reusable workflow calls:** rejected
  because another repository would control how Fabryka is reviewed.
- **Remove verification and triage entirely:** rejected because review and
  regression checks are useful before application code lands.

## References

- Builds on: [ADR-0001](0001-record-architecture-decisions.md), [ADR-0002](0002-agent-portable-instruction-surface.md)
- Supersedes: [ADR-0003](0003-verify-gate-risk-paths-and-corrections.md)
- Shapes: [agent-ready repository](../design/agent-ready-repository.md), [PR triage spec](../specs/pr-triage.md), [repository setup](../new-repository.md)
