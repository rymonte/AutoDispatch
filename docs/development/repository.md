# Repository audit and settings

Audit: 15 November 2026. Origin is `git@github.com:rymonte/AutoDispatch.git`; default branch is main. At the bootstrap audit the repository was private; authenticated GitHub CLI user rymonte has ADMIN permission. Starting branch was arch-agentic-dev-foundations with a clean working tree at 3a01ea0. Bootstrap uses chore/repository-foundations.

The five tracked files were README.md, prd.md, prd-v0.3.md and two domain/data proposals. All discovery artifacts were committed. There was no application scaffold, package tooling, workflow or executable test suite. This is legitimate discovery status. The four discovery artifacts remain unchanged. No issues were returned by the audit; no implementation backlog is created.

## GitHub configuration and limitations

Use squash merging only, auto-delete merged branches and keep main as default. Required reviews remain zero for a solo maintainer; merge queue is unnecessary. Issue labels identify type and unresolved validation/decision status without assigning priorities to every discovery item.

### Main protection update - 15 November 2026

The product owner made the repository public and authorised protection of main. The earlier private-repository API limitation no longer applies. Visibility and ownership were not changed by this setup.

Ruleset [Protect main](https://github.com/rymonte/AutoDispatch/rules/27330040) (ID 27330040) targets only refs/heads/main:

- Require a pull request, with zero approving reviews for the solo-maintainer workflow.
- Require all review conversations to be resolved.
- Require successful Repository checks and PR title checks from GitHub Actions (integration ID 15368), with the branch up to date.
- Require linear history; block force pushes and branch deletion.
- No bypass actors, including administrators; no merge queue.

Activation status: disabled pending successful checks on the verification PR. The bootstrap PR #1 already passed both named checks; its check-runs identify GitHub Actions as their source. The setup will activate only after a fresh documentation PR passes, then verify the effective rules on main before merging that PR normally.

Squash merging is enabled and merged branches are automatically deleted. Repository-level rebase merging is also enabled; the contribution workflow remains squash-only. This protection change does not alter the other merge settings.

The absence of a legacy branch-protection object does not mean the branch is unprotected when an active ruleset applies. Inspect both the ruleset and the effective branch rules using the GitHub API.

Before public launch, enable private vulnerability reporting under Settings ? Security where available. Inspect secret scanning/push protection eligibility and enable supported controls. Neither is claimed active by bootstrap. CodeQL is deferred until supported source exists. The maintainer approved PolyForm Noncommercial 1.0.0 and contributor-retained copyright on 15 November 2026; see licensing.md. Development-baseline approval remains outstanding.

## Verification limits

Repository tooling uses no runtime dependencies. npm audit initially reported four low-severity findings through markdownlint's transitive KaTeX dependency (GHSA-238p-pmpm-9mq7); no high/critical findings. Do not force-downgrade the linter or suppress the advisory to claim a clean audit. Dependabot can track the upstream fix. Formatting and lint exclusions preserve the four existing discovery artifacts rather than rewriting authoritative research.
