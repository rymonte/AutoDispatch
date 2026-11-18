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

Activation status: **active**. Both required jobs passed on [verification PR #5](https://github.com/rymonte/AutoDispatch/pull/5), at commit 6b3b034d4f9798cf64e6e8887ec955923de735af, before activation. The ruleset API then returned active with an empty bypass list; the effective main branch rules endpoint returned all five configured rules. GitHub reported the PR mergeable without a review approval. This final documentation update must pass the same checks before normal squash merge; no admin bypass is used.

Squash merging is enabled and merged branches are automatically deleted. Repository-level rebase merging is also enabled; the contribution workflow remains squash-only. This protection change does not alter the other merge settings.

The absence of a legacy branch-protection object does not mean the branch is unprotected when an active ruleset applies. Inspect both the ruleset and the effective branch rules using the GitHub API.

Before public launch, enable private vulnerability reporting under Settings ? Security where available. Inspect secret scanning/push protection eligibility and enable supported controls. Neither is claimed active by bootstrap. CodeQL is deferred until supported source exists. The maintainer approved PolyForm Noncommercial 1.0.0 and contributor-retained copyright on 15 November 2026; see licensing.md. Development-baseline approval remains outstanding.

## Verification limits

Repository tooling uses no runtime dependencies. The direct Markdown lint runner removes the CLI wrapper's unpatched `picomatch` dependency chain (GHSA-fc5q-39xc-vjpf) while retaining the same lint engine and rules. The transitive KaTeX advisory (GHSA-238p-pmpm-9mq7) remains a known low-severity finding; a passing high-severity audit threshold is not a claim of zero advisories. Do not force-downgrade the linter or suppress advisories. Dependabot can track upstream fixes. Formatting and lint exclusions preserve the four existing discovery artifacts rather than rewriting authoritative research.
