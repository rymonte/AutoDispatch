# Testing strategy for implementation

No executable application tests or compatibility results exist. PRD ACxx entries are acceptance criteria, not passed tests. Select the smallest coherent toolset once the implementation layout/build is approved; see the quality plan.

## Early development prototype

DEC-061 moves executable validation out of design issue #20 into the early development prototype. The product owner intends a flight-monitoring harness to observe phases, states and captured events. Closing #20 accepts contracts; it does not mark AC11/AC13, PRE-03/04/05/08/09 or provider compatibility as passed. Baseline approval and the applicable implementation/live-validation authorisation remain necessary before running it.

The prototype has three responsibilities:

| Responsibility        | Evidence to record                                                                                                                                                                                                                                                      | Dependency                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Flight monitoring     | Simulator/aircraft versions; sanitized expected versus observed phases, departure, return to gate, liftoff, arrival, shutdown, disconnect and missed-event cases. Preserve unknown timestamps and distinguish declared intent from detected arrival.                    | PRE-03/04/05; AC03/12/13/15 |
| Local domain and IPC  | Synthetic commands/results exercise typed validation, revision guards, duplicate commands, planning edits, recovery insertion, original ACARS retention and distinct SimBrief/Hoppie retry policies.                                                                    | DEC-056–060; AC02/05/07/13  |
| Working-state storage | Normal restart and process termination around write/replace/acknowledgement, action outcomes, recovery acceptance and clear. Include failed saves, unreadable state, retry budgets and separate settings/credentials. Record exact Windows/filesystem/runtime versions. | DEC-054/060; AC11           |

The flight harness alone cannot prove persistence reliability; add writer interruption checks when the writer exists. Use synthetic/fake services for local checks, with permitted recordings where helpful. Real service and simulator operations require their specific authorisation and evidence. JSON remains the preferred candidate; a failed reliability/complexity assessment triggers consideration of SQLite rather than a general file-repair engine.

Broader OS-crash, sudden-power-loss and device-cache guarantees remain explicitly undecided under DEC-054. They are deferred from #20, not promised, waived or included in process-kill evidence. Decide them before claiming broader durability or commissioning that test programme. Deployment/licence checks remain in the licensing policy; no runtime/SDK adoption follows from design closure.

## Implementation and release coverage

Prioritise simulator-independent pure domain tests: rotation invariants, lifecycle/phase transitions, scheduling/turnaround, UTC semantics, dispatch eligibility, duplicates, recovery and ACARS content. Include boundary values, stale/unknown observations, phase skipping and failures. Use controlled clocks and synthetic telemetry.

Add integration/contract tests for SimConnect ports, SimBrief parsing and generation outcomes, Hoppie acceptance/failure/ambiguity, persistence/recovery and IPC validation. Use synthetic or permitted redacted recordings; retain source, version and field semantics. Mocks establish behaviour against a model, not vendor compatibility. Avoid real credentials or network dependencies in normal CI.

Use React component/interaction tests and a small set of end-to-end UI journeys. Exercise the packaged Windows application for process, preload, IPC and packaging behaviour. Evaluate Vitest, React Testing Library and Playwright when runnable code exists.

Separately authorised live validation covers representative MSFS/aircraft combinations and unsupported-by-mocks behaviour. Record simulator/aircraft/library versions, hardware, scenario, expected versus observed results, date, repeatability and limitations. Keep live checks outside hosted CI. Resource validation measures the complete release-packaged process tree and simulator frame times under agreed PRE-08 budgets, including sustained/minimised operation. Never infer compatibility from API documentation or a sample alone.

Coverage collection and approximately 80% meaningful line coverage (plus branch coverage where useful) begin with real production code. Protect critical domain rules and new changes; justify uncovered paths. No empty-project coverage gate is configured.
