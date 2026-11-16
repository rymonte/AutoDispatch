# Repository checks and future code quality

Use Node.js 24 LTS and npm. From a clean checkout run:

```sh
npm ci --ignore-scripts
npm run check
npm audit --omit=optional --audit-level=high
```

`npm run format` formats maintained files. Prettier checks Markdown, JSON, YAML and tooling JavaScript; markdownlint checks documentation structure. The repository script strictly parses YAML/JSON, verifies relative Markdown file targets and full action SHA pins. Dependency audit checks development-tool advisories. CI uses the same commands. No application build, tests or coverage exists.

The four pre-existing discovery artifacts are excluded from formatting/Markdown style checks to preserve their contents. Their file links use local research paths and are not portable; the local link check scopes itself to maintained documentation. Do not broaden exclusions to hide newly introduced problems. Network link availability is not asserted.

PR title validation uses read-only event metadata, never a shell interpolation of the title. Stable jobs are `Repository checks` and `PR title`. The title workflow uses pull_request without checkout or contribution-code execution so title edits and forks can be checked safely. Repository checks run unprivileged on pull_request. Fork workflow approval can still be required by GitHub.

Dependabot-authored PRs are exempt from Conventional Commit title validation. The `PR title` job still runs and succeeds explicitly for `dependabot[bot]`, preserving the required branch-protection check. The exemption uses the PR author rather than the triggering actor, so maintainer-triggered reruns remain exempt and other authors remain subject to validation.

## After baseline approval

Introduce strict TypeScript compiler checks, explicit public contracts, unknown/narrowing rather than unjustified any, unused detection and consistent errors. Suppressions need a reason and bounded follow-up. Select ESLint TypeScript rules, Prettier, build tooling and boundary enforcement around actual paths.

Evaluate Vitest for unit/contract tests, React Testing Library for component interactions and Playwright for UI end-to-end checks. Add application builds, coverage, dependency scanning, CodeQL for supported source and Windows Electron packaging verification only when meaningful source exists. Avoid overlapping tools and dormant required jobs. Use approximately 80% meaningful line coverage and appropriate branch coverage once production code/tests exist; prioritise new code and critical domain rules. Never dilute tests to reach a percentage.

Dependabot covers Actions and the actual npm development manifest now. Runtime dependency updates begin only after authorised manifests exist. Changes to pins and lockfiles require review; npm installation uses ignore-scripts to avoid lifecycle execution in repository checks.
