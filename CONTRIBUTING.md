# Contributing

## Contribute during discovery

Read the [PRD](prd.md) and [agent contract](AGENTS.md). Documentation corrections, bounded research, technical-design proposals and tooling improvements are welcome. Use discovery and decision issue forms. Record dated sources, exact versions, evidence level, confidence, limitations, required live validation and implications for open questions. Never assume an undocumented external API exists. Redact credentials and respect vendor redistribution terms.

Community suggestions remain proposals until the maintainer/product owner accepts them. Do not change scope, architecture or PRD approval status by implication. PRE gates remain open as recorded; no application scaffold, runtime dependency or MVP implementation is authorised by bootstrap. Baseline approval and a specific implementation task are required first.

## Workflow

Use trunk-based development: branch from current main, keep work short-lived and focused, open a PR, self-review the full diff, address checks/conversations and squash merge. Use `feat/`, `fix/`, `docs/`, `chore/`, `ci/` or `research/` descriptions. No unrelated edits or unexplained dependency additions. Administrative maintenance need not create an issue.

Use Conventional Commits for PR titles and prefer them for commits: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, optional scope, then colon and summary. Use `!` or a `BREAKING CHANGE:` footer for breaking changes. Example: `docs(discovery): clarify validation evidence`. Squash PR titles are validated; individual branch commits are not separately gated.

Substantive implementation issues must reference relevant Mxx, ACxx, DEC-xxx and blocking PRE-xx entries, with testable acceptance criteria. Research should reference its open question/PRE item. PRs must separate accepted decisions from recommendations and describe risks and outstanding questions.

## Quality and reports

Run [local checks](docs/development/quality.md). Update relevant documentation with changes. For documentation-only work report repository checks; do not claim application tests. Once implementation is authorised, add meaningful tests under the [testing strategy](docs/testing/strategy.md), including negative and recovery cases. AI-generated work has identical standards: contributors must understand, verify and self-review it, disclose material uncertainties and never submit fabricated evidence or secrets.

There is no released app yet. Use bugs for repository defects now; future app reports should include versions, aircraft, reproduction, expected/actual results and sanitised evidence. Feature requests describe the user problem and alternatives and do not automatically expand MVP. Sensitive vulnerabilities follow SECURITY.md.

## Contribution licensing and acknowledgement

By intentionally submitting an original contribution for inclusion, you agree to license it under the repository's [PolyForm Noncommercial 1.0.0 licence](LICENSE). You retain copyright in your contribution; no copyright assignment is required. Submit only material you own or are authorised to license on these terms. Clearly identify third-party material and its licence before submission; do not silently relicense it.

Contributing does not grant ownership of existing project material, maintainer authority or entitlement to donations or other revenue. Accepted contributions will be acknowledged in the relevant release notes using your GitHub handle or preferred attribution, unless you request no public acknowledgement. Release-note credit is additional to any required copyright notices. Preserve applicable contributor notices.

The maintainer retains control of the official repository and releases. The project licence grants non-commercial rights; it does not give the maintainer separate commercial rights to contributor-owned code. Commercial relicensing of that code would require the relevant rights holders' permission. No broader contributor agreement is imposed. See the [licensing policy](docs/development/licensing.md).
