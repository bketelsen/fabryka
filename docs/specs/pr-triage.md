# Spec: Pull request triage

Fabryka uses pull request labels to indicate the depth of review required and
whether the head commit is ready for human review.

## Interface

The [caller](../../.github/workflows/risk-paths.yml) handles `opened`,
`synchronize`, `reopened`, `edited` and `labeled` events on `pull_request_target`.
It calls the [local reusable workflow](../../.github/workflows/pr-triage.yml)
from the same commit, and the job checks out the trusted base commit, not the
pull request head. Pull request data is read through the GitHub API; it is
never executed.

[`.github/risk-paths.json`](../../.github/risk-paths.json) is a strict JSON
object with the following fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `schema_version` | integer | `2` |
| `default_level` | string | `L1`, `L2`, `L3` or `L4`, used for unmatched paths |
| `paths` | nonempty array | Entries contain exactly `glob`, `level` and `why` |
| `paths[].glob` | string | Repository-relative, case-sensitive glob |
| `paths[].level` | string | `L1`, `L2`, `L3` or `L4` |
| `paths[].why` | string | Nonempty reason naming the risk category, up to 200 characters |

`L1` means read every line; `L2` means read the diff; `L3` means skim; `L4`
means check the title and CI.

## Rules

- Each file takes its strictest matching glob or, if none matches, the
  default level. The [repository review floors](../../scripts/lib/risk-paths.mjs)
  can make that level stricter: sensitive file names and extensions are L1;
  CI, actions and policy paths are at least L2.
- A pull request takes the strictest level among its changed files. Count
  both names of a renamed file. At GitHub's 3,000-file API limit, use L1.
- Keep the stricter of the computed level and any existing level labels.
  Add `risk:high` at L1 or L2 and never remove it automatically. If that
  repository label is missing, fail. If any level label is missing, report
  the missing labels and leave existing level labels alone.
- Drop `ready-for-human` when a labeled head moves. If the label is added,
  require a successful GitHub Actions `verify` check and no non-green
  check runs or commit statuses at the head. Completed successful, neutral
  and skipped check runs are green; commit statuses must be successful.
  A stale event for a different head or base, or a closed PR, must not
  change labels.
- `make verify` checks the config, the local workflow reference and that
  the config explicitly covers the list, both triage workflows and the
  triage script at L1 or L2.

## References

- Rationale: [ADR-0004](../adr/0004-own-the-repository-baseline.md)
- Context: [agent-ready repository](../design/agent-ready-repository.md)
