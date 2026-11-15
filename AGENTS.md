# Agent development contract

## Authority and orientation

AutoDispatch is in pre-implementation discovery. Read [prd.md](prd.md) in full for initial orientation, then relevant Mxx, ACxx, DEC-xxx and PRE-xx entries before each task. The PRD governs scope and approval status. Historical snapshots and domain/data proposals do not override it. This file governs agent engineering conduct; CONTRIBUTING.md describes the shared contribution workflow.

Classify the assigned task as discovery, technical validation, architecture design, tooling or implementation. Establish scope, acceptance criteria, dependencies and assumptions before changing files. Administrative maintenance need not invent product references or tickets.

DEC-046 accepts Electron/TypeScript/React with Node backend execution. DEC-050 requires pure TypeScript domain modules defining ports, free of Node, Electron, React and concrete adapters. Domain and integration layers execute in a utility process; dependencies point inward. React presents snapshots and submits commands. Main is thin: lifecycle, IPC routing, utility supervision and safeStorage credential operations. Persistence executes in backend integrations. See docs/architecture/boundaries.md.

## Discovery restriction

Authorised documentation, planning, research, tooling and repository configuration are permitted. Do not independently implement MVP functionality, scaffold Electron, implement speculative domain models, add runtime dependencies, build production adapters, create a database schema or run live simulator/vendor validation. Live validation requires specific task authorisation. Implementation requires both explicit development-baseline approval and an authorised implementation task.

PRE-01?PRE-10 keep their PRD statuses and dependencies. Unattended SimBrief permission is a viability gate. node-simconnect is a candidate; Hoppie, airports, simulator signals, resource budgets, IPC, state ownership, storage/recovery, authentication, cancellation and logging still need validation or design. Tooling does not close these gates. Do not promote provisional designs or change PRD approval statuses without supporting decisions and evidence. Product and architecture scope changes require maintainer/product-owner approval.

## Evidence and integrity

Stay within the assigned issue. Preserve requirement IDs and traceability. Explicitly label accepted decisions, proposals, documented capability, third-party demonstrations, source inspection, live validation and unverified assumptions. Record sources, versions, dates, confidence, limitations and implications for open decisions. Another agent's assertion is not independently verified evidence.

Never invent API capabilities, tests, benchmarks or compatibility evidence. Report commands actually run and outcomes honestly; no executable application tests exist today. Never disable or weaken checks to pass CI. Do not disclose credentials, vendor private material or personal diagnostics. Follow SECURITY.md. Prefer focused changes and explain dependencies.

## Workflow

1. Read the issue and identify requirements, acceptance criteria, decisions and blocking PRE items.
2. Review affected architecture and establish implementation/testing scope within authorisation.
3. Make the smallest appropriate change and write/update meaningful tests where executable behaviour exists.
4. Run `npm ci --ignore-scripts` and `npm run check`; follow docs/development/quality.md for other applicable checks.
5. Self-review the complete diff for correctness, security, traceability, unintended changes and architectural violations.
6. Open a documented PR on a short-lived branch with a Conventional Commit title. Address CI and review findings before squash merge.

Use CONTRIBUTING.md and the PR template. Preserve unrelated local work. Do not merge decisions by implication through research. Add implementation quality checks only as real code and layout exist.

## Delegation

When delegation is authorised, assign bounded tasks with explicit scope, expected outputs, acceptance criteria and verification evidence. Pass these same engineering, evidence and safety rules to workers. Coordinate file ownership; avoid concurrent edits to the same files. Child agents cannot bypass the parent's scope or approvals. Inspect their diffs and independently verify material claims. Coordinators remain responsible for integration and self-review. Keep guidance tool-agnostic; do not duplicate this contract in competing agent configuration files.
