# Repository audit and settings

Audit: 15 November 2026. Origin is `git@github.com:rymonte/AutoDispatch.git`; default branch is main. Repository is private; authenticated GitHub CLI user rymonte has ADMIN permission. Starting branch was arch-agentic-dev-foundations with a clean working tree at 3a01ea0. Bootstrap uses chore/repository-foundations.

The five tracked files were README.md, prd.md, prd-v0.3.md and two domain/data proposals. All discovery artifacts were committed. There was no application scaffold, package tooling, workflow or executable test suite. This is legitimate discovery status. The four discovery artifacts remain unchanged. No issues were returned by the audit; no implementation backlog is created.

## GitHub configuration and limitations

Use squash merging only, auto-delete merged branches and keep main as default. Required reviews remain zero for a solo maintainer; merge queue is unnecessary. Issue labels identify type and unresolved validation/decision status without assigning priorities to every discovery item.

Both ruleset listing and legacy main protection API returned HTTP 403: GitHub requires a plan upgrade or public visibility for this private repository. Protection state therefore could not be inspected or configured. Visibility and ownership must remain unchanged. Until protection is available, the maintainer must enforce PR-only merges and avoid direct main pushes operationally; this is not technical enforcement.

After plan eligibility changes, activate protection as follows:

1. Confirm Actions is enabled and the bootstrap PR has successful `Repository checks` and `PR title` jobs on its latest revision. Inspect `gh pr checks <number>` and the commit check-runs API; use the observed names, not assumed workflow names. Resolve failures first.
2. In Settings ? Rules ? Rulesets, create a branch ruleset targeting main (or the default branch), initially disabled. Require pull requests with zero approvals, resolved conversations and linear history. Block force pushes and branch deletion. No routine admin bypass and no merge queue.
3. Add only the observed successful status checks, selecting GitHub Actions as source where supported. Do not require future build/test/coverage jobs. Check that a sole maintainer can squash merge the PR without an unavailable approval.
4. Activate only after successful check evidence. If activation happens after bootstrap merge, first verify these checks on a subsequent small PR. Record ruleset ID, settings and verification in a follow-up PR.

Before public launch, enable private vulnerability reporting under Settings ? Security where available. Inspect secret scanning/push protection eligibility and enable supported controls. Neither is claimed active by bootstrap. CodeQL is deferred until supported source exists. Licence choice/copyright holder and development-baseline approval require explicit maintainer decisions.

## Verification limits

Repository tooling uses no runtime dependencies. npm audit initially reported four low-severity findings through markdownlint's transitive KaTeX dependency (GHSA-238p-pmpm-9mq7); no high/critical findings. Do not force-downgrade the linter or suppress the advisory to claim a clean audit. Dependabot can track the upstream fix. Formatting and lint exclusions preserve the four existing discovery artifacts rather than rewriting authoritative research.
