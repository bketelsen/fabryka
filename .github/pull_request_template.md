<!-- The repository owner reviews risk:high pull requests. Branch from the
latest base branch. Reviews apply the repository's docs and PR rules. -->

## Summary

<!-- What changes and why, in a few sentences. Link the issue(s) this closes. -->

## Risk tier

Declare the highest applicable tier, never lower. A `risk:high` label (review level L1 or L2) means tier 3.

Level: `level:L1` to `level:L4` — repository triage computes it from the matched globs, `default_level` and the repository review floors. Triage never lowers an existing level. At L1, name each high-risk path in this body and say why the change is safe.

Scale: 1 low = docs, tests, comments; 2 medium = behaviour change in code; 3 high = security, data loss, releases or publishing, CI and permissions, or any `risk:high` label.

Risk tier: 1 — <!-- justification -->

## Docs housekeeping

<!-- Delete rows that do not apply. -->

- [ ] New docs started from their category's `TEMPLATE.md`
- [ ] Every new doc indexed in `docs/README.md`
- [ ] Cross-links added in both directions (ADR ↔ design ↔ spec ↔ plan)
- [ ] New significant decision recorded as an ADR first, in this PR
- [ ] New or edited ADRs are fact-only: context, decision and consequences
- [ ] Conformance aliases and canonical symlinks are unchanged; canonical targets are edited instead

## Verification

<!-- Paste evidence for every applicable gate. -->

- [ ] `make verify` green
- [ ] Revert test for a fix: the new test fails with the fix reverted; command: <!-- name it -->
- [ ] Workflows changed: every action is SHA-pinned with `# vX.Y.Z`, `permissions: {}`, and `persist-credentials: false`
- [ ] Blocking review point fixed: guard added and 1 file added under `.memory/corrections/`
