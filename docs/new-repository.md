# Configure Fabryka on GitHub

[Back to the README](../README.md). These are repository settings from
[ADR-0004](adr/0004-own-the-repository-baseline.md). In the commands below,
replace `OWNER/REPO` with Fabryka's current GitHub repository slug.
For how these settings affect day-to-day contributions, see
[contributor conventions](conventions.md).

1. Create the PR triage labels:

   ```sh
   gh label create risk:high --repo OWNER/REPO --color B60205 --description "Needs tier 3 review"
   gh label create level:L1 --repo OWNER/REPO --color B60205 --description "Read every line"
   gh label create level:L2 --repo OWNER/REPO --color D93F0B --description "Read the diff"
   gh label create level:L3 --repo OWNER/REPO --color FBCA04 --description "Skim"
   gh label create level:L4 --repo OWNER/REPO --color 0E8A16 --description "Title and CI"
   gh label create ready-for-human --repo OWNER/REPO --color 0E8A16 --description "Current head is ready for human review"
   ```

   Without `risk:high`, PR triage fails. If a level label is missing, the job
   warns and does not change level labels.

2. Add a ruleset on the default branch: it requires the `verify` check and a
   pull request for every change, and it blocks deletion and force-push.
   Repository admins can bypass it. Run it as a repository admin:

   ```sh
   gh api -X POST repos/OWNER/REPO/rulesets --input - <<'EOF'
   {"name":"main: require verify","target":"branch","enforcement":"active",
    "conditions":{"ref_name":{"include":["~DEFAULT_BRANCH"],"exclude":[]}},
    "bypass_actors":[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"}],
    "rules":[{"type":"deletion"},{"type":"non_fast_forward"},
     {"type":"pull_request","parameters":{"required_approving_review_count":0,"dismiss_stale_reviews_on_push":false,
      "require_code_owner_review":false,"require_last_push_approval":false,"required_review_thread_resolution":false}},
     {"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":false,
      "do_not_enforce_on_create":false,"required_status_checks":[{"context":"verify","integration_id":15368}]}}]}
   EOF
   ```

   `15368` is the GitHub Actions app; `actor_id` 5 is the repository admin role.

3. Enable private vulnerability reporting as a repository admin:

   ```sh
   gh api -X PUT repos/OWNER/REPO/private-vulnerability-reporting
   ```

4. As Fabryka adds signing, authentication, publishing, secrets, destructive
   operations or CI paths, update `.github/risk-paths.json` following the
   [PR triage spec](specs/pr-triage.md).
