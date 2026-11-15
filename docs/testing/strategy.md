# Testing strategy for implementation

No executable application tests or compatibility results exist. PRD ACxx entries are acceptance criteria, not passed tests. Select the smallest coherent toolset once the implementation layout/build is approved; see the quality plan.

Prioritise simulator-independent pure domain tests: rotation invariants, lifecycle/phase transitions, scheduling/turnaround, UTC semantics, dispatch eligibility, duplicates, recovery and ACARS content. Include boundary values, stale/unknown observations, phase skipping and failures. Use controlled clocks and synthetic telemetry.

Add integration/contract tests for SimConnect ports, SimBrief parsing and generation outcomes, Hoppie acceptance/failure/ambiguity, persistence/recovery and IPC validation. Use synthetic or permitted redacted recordings; retain source, version and field semantics. Mocks establish behaviour against a model, not vendor compatibility. Avoid real credentials or network dependencies in normal CI.

Use React component/interaction tests and a small set of end-to-end UI journeys. Exercise the packaged Windows application for process, preload, IPC and packaging behaviour. Evaluate Vitest, React Testing Library and Playwright when runnable code exists.

Separately authorised live validation covers representative MSFS/aircraft combinations and unsupported-by-mocks behaviour. Record simulator/aircraft/library versions, hardware, scenario, expected versus observed results, date, repeatability and limitations. Keep live checks outside hosted CI. Resource validation measures the complete release-packaged process tree and simulator frame times under agreed PRE-08 budgets, including sustained/minimised operation. Never infer compatibility from API documentation or a sample alone.

Coverage collection and approximately 80% meaningful line coverage (plus branch coverage where useful) begin with real production code. Protect critical domain rules and new changes; justify uncovered paths. No empty-project coverage gate is configured.
