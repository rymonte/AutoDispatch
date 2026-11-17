# AutoDispatch — data model contract

**Design contract, 17 November 2026; review in PR #23.** The tables and nested records below specify the local model. They are documentation, not an executable schema or a validated writer. The current review rules in DEC-056–060 and unsuperseded DEC-051–054 are accepted; this does not approve the complete model or close PRE-09. Electron + React + TypeScript is decided; JSON is the preferred persistence direction.

Read alongside the [domain and persistence proposal](domain-persistence-proposal.md) and authoritative [PRD](prd.md). DEC-046/050 record the accepted stack and utility-process/domain/integration separation. This contract applies DEC-056–061 while preserving PRE-02/04/09 uncertainties. No service payload fields or endpoints are assumed to be verified.

## Model at a glance

Keep one **Rotation** containing ordered **FlightLegs**, with rotation-scoped **PlanningRequests**, **PlanResults** and **Messages**. Preferences and reusable turnaround rules have a separate lifetime. A leg contains three different kinds of information: editable planning, returned planning results, and observed operational facts.

```mermaid
erDiagram
    WorkingState ||--o| Rotation : contains
    Rotation ||--o{ FlightLeg : orders
    Rotation ||--o{ PlanningRequest : owns
    Rotation ||--o{ PlanResult : retains
    Rotation ||--o{ Message : retains
    FlightLeg ||--|| LegPlanning : contains
    FlightLeg ||--|| OperationalFacts : contains
    PlanningRequest ||--|| SubmittedInputs : freezes
    PlanningRequest ||--o| PlanResult : produces
    Preferences ||--o{ TurnaroundRule : contains
    Preferences ||--o{ AirlineIdentity : contains
```

A stable leg identity survives planning edits. Original ACARS messages belong to the rotation and keep their leg association and frozen context. Planning revisions reject obsolete responses; they do not require historical leg copies, a route-version browser or a complete retained planning graph (DEC-057).

These are plain data objects, not SQL tables or an inheritance hierarchy. All operational objects save together in `working-state.json`. Pure domain modules validate and change them; the utility-process persistence adapter serializes the snapshot. Storage metadata such as checksums belongs to the adapter, not the flight domain. The renderer receives display snapshots, not writable domain objects.

## Common value conventions

| Value | Representation and meaning |
|---|---|
| IDs | Opaque unique strings, generated through a domain port. Stable across restart; never derived from array position, airport or callsign. |
| UTC instant | Full ISO UTC string, e.g. `2026-11-15T13:23:00Z`. Field names identify simulator versus system clock. |
| Flight date | `YYYY-MM-DD`; full event instants still include their own dates, including overnight arrivals. |
| Unknown | Explicit `null`, not zero, empty string or a made-up time. Empty collections use `[]`. |
| Duration | Numeric minutes with a named field; finite and nonnegative. No unspecified time unit. |
| Fuel/weight | `{ value, unit }`, with unit `kg` or `lb`; fuel inputs that permit duration use a tagged minutes alternative. Zero means a supplied zero; null means unspecified/unavailable. |
| Revision | Nonnegative integer; snapshot revision changes per successful save, planning revision per change to relevant effective inputs or invalidation of preparation context. Neither uses simulator time. |
| External reference | Opaque service-provided identifier, nullable. Not interchangeable with our local request or result ID. |

Validate airport/callsign/catalogue values against the relevant accepted rules and verified integration contract. Do not prematurely encode guessed service lengths, identifier formats or unsupported planning options. Raw service DTOs stay in adapters; normalized domain values retain provenance and units.

Telemetry and message read/unread updates do not create new planning revisions or copies of legs. Original message associations survive planning edits.

## Files and top-level ownership

| File | Contents | Lifecycle |
|---|---|---|
| `working-state.json` | Storage envelope plus one nullable rotation and everything needed to resume it | Replaced atomically as described in the persistence proposal |
| `preferences.json` | Independently versioned preferences, turnaround rules, airline identities and non-secret integration references | Survives rotation replacement and clear |
| Optional document files | Immutable OFP documents referenced from the snapshot, if needed | Rotation-scoped; never used to discover or restore a rotation |

The working-state envelope has `schemaVersion`, `revision`, `savedAtSystemUtc`, `rotation`, the bounded `lastCommand` receipt, and adapter-owned integrity metadata. A cleared rotation is explicitly `rotation: null`. Do not retain a deleted-rotation catalogue. The integrity encoding is specified below; a checksum cannot establish whether an old valid snapshot is current. The Windows replacement mechanism remains prototype validation work under DEC-061.

**Rotation**

| Field | Type | Meaning |
|---|---|---|
| `id` | `Id` | Unique working-rotation identity; replacement gets a new ID |
| `started` | `boolean` | True only after the matching first operational OFP successfully completes startup under M16; never inferred from airborne telemetry |
| `aircraft` | `AircraftConfiguration` | Current shared aircraft configuration used for editable legs |
| `legs` | `FlightLeg[]` | Ordered FlightLeg array; order is stored once, not also in a separate position field |
| `planningRequests`, `planResults`, `messages` | `PlanningRequest[], PlanResult[], Message[]` | Rotation-scoped collections described below |
| `handover` | `Handover or null` | Null or `{ inboundLegId, nextLegId, completedAtSimulatorUtc }`; the normal ten-minute due time is derived. Accepted recovery activates immediately instead. |
| `diversionIntent` | `DiversionIntent or null` | Null or `{ legId, intendedAirportIcao }`; separate from planned destination and actual arrival, persisted through restart |
| `recoveryHolds` | `RecoveryHold[]` | Typed holds with the originating leg and any affected next-leg ID |

Derive the active leg from `legs[].lifecycle`; enforce at most one Active leg instead of maintaining a second mutable active-leg pointer. An unstarted rotation has none; a handover interval can also have none. This deliberately simplifies the earlier architecture sketch's active-leg pointer. Startup-in-progress is derived from an unstarted rotation and its first leg's outstanding operational-OFP request, initiated only by Start Rotation.

## Flight leg and planning

**FlightLeg**

| Field | Type | Meaning |
|---|---|---|
| `id` | `Id` | Stable leg identity |
| `lifecycle` | `LegLifecycle` | `pending`, `active` or `completed` only |
| `planningRevision` | `Revision` | Revision of effective inputs used to associate results |
| `planning` | `LegPlanning` | LegPlanning value object |
| `operations` | `OperationalFacts` | OperationalFacts value object |
| `currentOfpId` | `Id or null` | Null or latest associated successful operational PlanResult; may be Out of date |
| `advanceResultId` | `Id or null` | Null or successful preliminary result for this next leg; persists the automatic-preparation success marker |
| `automaticPreliminaryMessageId` | `Id or null` | Null or the automatic message for the current preparation workflow; explicit updates do not replace it. Recovery reset clears this marker, not the original rotation-owned message. |
| `arrivalDispatch` | `ArrivalDispatch or null` | Null or `{ inboundLegId, requestId, shutdownObserved }`; request ID is nullable until generation is requested |

`arrivalDispatch` tracks one automatic operational-OFP workflow, with no primary/fallback plan categories. Low-speed arrival and shutdown evaluate the same workflow. Saved success prevents another automatic generation even if edits make its OFP Out of date; explicit regeneration is separate. A pending cycle prevents overlapping cycles, but no usable OFP permits bounded retries under DEC-059, including uncertain outcomes. Shutdown does not reset an exhausted budget; user Retry starts a fresh cycle. If a later eligible request uses changed gate timing, capture new immutable inputs and update this reference. `shutdownObserved` remembers a past opportunity, not live proof of ground state or clear holds.

**Accepted recovery clarification (DEC-053/056):** a recovery action creates an ordinary leg with a new ID and fresh planning inputs, without a permanent `recoveryOf` link or special subtype. The original completed attempt remains intact. Acceptance immediately activates the new leg and starts generation with approval-time simulator UTC as requested off-block; no turnaround or ten-minute activation wait applies. Default ATC callsign is the first up-to-six characters of the affected flight's callsign plus R (EZY1234 → EZY123R); optional IATA flight number stays unchanged. Temporary holds identify the arrival requiring a choice until resolved. Normal subsequent-leg behaviour resumes after this explicit activation/filing exception.

**LegPlanning**

| Field | Type | Meaning |
|---|---|---|
| `originIcao`, `destinationIcao` | `AirportIcao (each)` | Planned airports; actual arrival is stored elsewhere |
| `atcCallsign`, `iataFlightNumber` | `string, string or null` | Separate identifiers; IATA number nullable |
| `flightDate` | `DateOnly` | Planning flight date |
| `aircraft` | `AircraftConfiguration` | Copy of effective shared aircraft values for this leg |
| `scheduledOffBlock`, `scheduledOnBlock` | `ScheduleBaseline or null (each)` | Independently nullable ScheduleBaseline objects |
| `turnaround` | `ResolvedTurnaround` | Resolved minutes, source (`override`, `prefixRule`, `default`), and optional source-rule ID |
| `fuelOptions` | `FuelOptions` | Nullable ATC, weather, MEL, extra, contingency and final-reserve inputs with explicit units |
| `weightUnitPreference` | `WeightUnit or null` | Nullable dispatch preference; never overrides returned OFP units |
| `simBriefOptions` | `SimBriefOptions` | Only explicitly modelled supported options after PRE-02 mapping; no unvalidated generic settings bag |

A ScheduleBaseline contains `atUtc` and `source` (`manual` or `firstFiled`). The nullable `originatingResultId` is an audit identifier; it does not require keeping discarded PlanResult data. Preserve the value/source by default through preparation reset; users can change it when planning is editable. Automatic initialization from first Filed is result processing, not a new input revision that immediately makes its own OFP stale. Explicit eligible schedule edits change planning revision when relevant to dispatch. Later Filed values never silently reset Scheduled.

**AircraftConfiguration** contains a tagged selection: either catalogue/manual setup (type, optional subtype/variant references and display labels) or a saved-airframe reference. It also contains optional registration and maximum passenger capacity. Saved-airframe use is optional; do not require unavailable personal-airframe listing. Keep returned/resolved aircraft details in the plan result as evidence of what SimBrief actually used. The exact override semantics of a saved airframe require PRE-02.

**Shared edit rule:** shared aircraft values supply defaults for current editable legs. Applying an edit copies values and increments affected revisions in the same snapshot. Background generation does not block an otherwise eligible edit: invalidate obsolete request context. Operationally locked legs retain their copies. Changing registration cannot rewrite completed history or already submitted inputs. No reusable fleet model is needed.

**Editing eligibility (DEC-058):** first-leg generation blocks UI interaction with a loading overlay while the backend stays responsive. Subsequent generation shows a toast/loading indicator; future pending legs remain editable. Current-leg editing requires fresh grounded/stationary/all-propulsion-engines-off telemetry; APU/external power is allowed. Engine start/taxi-out closes editing, but a return to gate before established airborne flight reopens it, including after an RTO. Preserve original off-block and other actuals. Once airborne or completed, planning stays locked.

Planning edits invalidate affected OFPs/requests. Airport changes outside diversion require explicit regeneration from the earliest viable leg: current if eligible, otherwise next eligible, including affected downstream preparation. Edits alone do not send replacement requests. Keep existing schedules and ACARS history.

## Operational facts, timestamps and holds

**OperationalFacts**

| Field | Type | Meaning |
|---|---|---|
| `departed` | `boolean` | Durable departure history, including inference from recovered airborne telemetry with unknown off-block. It is not by itself a permanent edit lock: a pre-flight return to gate may reopen edits. |
| `airborneEstablished` | `boolean` | Durable flight context and permanent planning-lock cause; permits later valid after-flight completion without requiring every phase |
| `phase` | `FlightPhase or null` | Nullable confirmed phase from M04/M16; initially unknown, never a substitute for lifecycle |
| `actualOffBlockUtc`, `actualTakeoffUtc`, `actualLandingUtc`, `actualOnBlockUtc` | `UtcInstant or null (each)` | Independently nullable simulator-observed event times |
| `filedOffBlock`, `filedOnBlock` | `FiledTime or null (each)` | Independently nullable `{ atUtc, ofpId }` values from the current operational OFP mapping |
| `arrival` | `Arrival or null` | Null before arrival; otherwise `{ episodeId, outcome, actualAirportIcao, identificationSource }` |
| `phaseContext` | `PhaseContext` | Bounded operating-altitude context specified below; detector extensions require PRE-04 evidence and a reviewed schema change |

`arrival.outcome` is `destination`, `return`, `diversion` or `unresolved`. `actualAirportIcao` is null when unresolved. `identificationSource` distinguishes validated automatic identification from exceptional user confirmation; numerical confidence scores are not invented. An arrival episode ID distinguishes confirmed arrival opportunities when implementing the agreed bounce/go-around rules. The detector's re-entry/reset rules remain PRE-04 work; raw brief ground contacts do not create completed arrivals.

The three time concepts remain separately persisted: Scheduled in planning, Filed with its OFP provenance, Actual in operations. The display combines them. Returning an OFP updates Filed but cannot reset Actual. A current plan arriving after departure is still associated; `departed` remains true. A response must match the current revision/context; request completion does not override operational editing restrictions.

Hold variants (declared intent itself imposes the first hold; only the other variants are stored in `recoveryHolds`):

- `declaredDiversion`: derived from `diversionIntent`; pauses onward workflow until cancellation or actual-arrival resolution.
- `arrivalAirportUnresolved`: originating inbound leg; awaiting exceptional airport confirmation.
- `arrivalRecoveryChoice`: originating return/diversion leg; onward automation suspended; prompt visibility follows completion.
- `manualRepositionAwaitingResume`: originating leg and target next leg; only explicit Resume releases it.

Represent holds explicitly rather than one `automationPaused` boolean. Clearing an airport hold must not accidentally clear a manual-reposition hold. Complete the inbound despite unresolved airport identity, but do not clear a final rotation or activate/dispatch onward until the applicable outcome is resolved. If confirmation establishes a normal final arrival after completion, normal clearing follows.

Normal handover anchors to inbound actual completion, not restart time. Due time is completion plus ten simulator minutes. Consume handover and activate its target in one snapshot; early qualifying departure additionally closes editing. Recovery acceptance instead activates its new leg immediately. Reordering/removal reconciles handover references and continuity atomically. No departure is recorded during a manual-reposition hold. Use actual arrival at the completed-history boundary, without rewriting the planned route; future legs connect by planned airports. Intentional gaps require manual reposition/Resume.

**Ordering during planning (DEC-058, superseding DEC-052):** first-generation overlay blocks edits. During subsequent generation, permit otherwise eligible insertion/removal/reordering; atomically invalidate affected planning revisions and captured inbound/target context. Preserve continuity and explicit holds. Reject obsolete callbacks at the response boundary rather than assuming remote cancellation. Normal handover/departure alone does not invalidate a correctly associated result. Matching only leg ID without revision/context is insufficient.

**Diversion intent and preparation reset (DEC-056/057):** before confirmed touchdown, users may declare, change or cancel an intended airport while retaining the original planned route. Pause onward planning, messaging/retries, timers and activation; monitoring/actuals continue. Preserve enough current work to resume from the paused point on cancellation, subject to normal eligibility and unrelated holds. No repeated successful steps.

Actual arrival determines normal arrival, return or diversion, regardless of declared intent. Landing at the original destination resolves intent through normal arrival. Unknown airport retains its hold. Declared and automatically detected abnormalities converge on the same recovery choice at stationary/full shutdown. An unanswered choice, elapsed time, relocation or restart never releases the hold.

Accepting recovery commits leg insertion/activation, resolved-hold release and preparation reset together. Keep completed history, remaining leg identities/user inputs, Scheduled baselines by default and all original ACARS audit messages. Discard remaining generated plans/preliminary data and obsolete request state; increment affected revision/context guards so late responses cannot repopulate them. A fresh workflow may generate a fresh automatic message. This reset is distinct from cancelling intent, which resumes paused work. Skipping recovery creates no leg and retains manual-reposition suspension until explicit Resume.

## Requests and returned plans

Keep requests separate from results. An acknowledgement is neither an OFP nor commencement. These are domain-side records, not claims about external API field names.

**PlanningRequest**

| Field | Type | Meaning |
|---|---|---|
| `id`, `rotationId`, `legId` | `Id (each)` | Local association; results must match all applicable identities |
| `kind` | `PlanningKind` | `advancePreparation` or `operationalOfp`: the requested planning outcome, not the reason it was triggered |
| `planningRevision`, `submittedInputs` | `Revision, SubmittedInputs` | Frozen effective leg/aircraft values plus resolved request-time readiness, taxi/turnaround inputs and their provenance |
| `eligibilityContext` | `EligibilityContext` | Captured startup-first-leg or inbound/next-leg identities checked under DEC-058; local coordination metadata, not an additional plan-kind enum or assumed service field |
| `state` | `PlanningState` | `prepared`, `possiblySent`, `succeeded`, `definitiveFailure`, `unusable` or `uncertain` |
| `attemptCount` | `integer 0..4` | Initial attempt plus up to three automatic retries for this cycle; retained across restart, no unlimited attempt log |
| `attemptToken` | `Id or null` | Correlation for a network invocation within this request/cycle; not a provider idempotency key |
| `createdAtSystemUtc`, `lastAttemptAtSystemUtc`, `finishedAtSystemUtc` | `UtcInstant, UtcInstant or null, UtcInstant or null` | Service/diagnostic times, with nulls where not applicable |
| `serviceReference`, `resultId` | `string or null, Id or null` | Nullable verified external reference and local result association |
| `failure` | `SafeError or null` | Null or normalized safe error category/details; never credentials or a whole unredacted response |
| `retryAfterSystemUtc` | `UtcInstant or null` | Next permitted retry time, subject to current holds, eligibility and the saved cycle budget |

The coordinator evaluates eligibility at the relevant trigger; it does not classify flight plans by trigger. Startup follows the unstarted-rotation rule. Arrival, shutdown, manual generation, regeneration and generation for a newly added recovery leg all request an operational OFP. A verified same-plan editing API may require an explicit target service-plan reference in submitted inputs; that is an adapter contract detail, not a reason to retain the larger trigger enum. Advance preparation remains distinct even if the eventual supported service workflow implements it using a saved plan.

One current generation cycle owns its frozen inputs and attempt accounting; it does not lock eligible planning edits. DEC-059 permits up to three retries after the initial attempt when no usable OFP arrives, including timeout/lost/corrupt output. Uncertainty remains uncertainty even though retry is allowed. Adopt one valid result matching current rotation/leg/revision/context and cycle; stop unsent retries and disregard additional/obsolete results. Possible duplicate remote SimBrief plans are accepted in this degraded case. A user Retry after exhaustion starts a fresh cycle with latest confirmed inputs and a fresh budget; preserve input throughout. Provider limits, timing/backoff and usable-result validation remain PRE-02 work.

`prepared` means the possibly-sent marker has not committed and the adapter has not been called under the write-before-send protocol. On restart, possibly-sent becomes uncertain and follows DEC-059 within the saved attempt budget; it must not become fabricated failure or success. Local request/attempt IDs provide correlation only, not service-side idempotency. Known successful work is not automatically repeated. Hoppie uses the separate conservative policy below.

**PlanResult**

| Field | Type | Meaning |
|---|---|---|
| `id`, `requestId`, `legId`, `planningRevision` | `Id, Id, Id, Revision` | Immutable local association |
| `kind` | `preliminary or operationalOfp` | `preliminary` or `operationalOfp`; a preliminary result never starts the rotation |
| `servicePlanReference`, `receivedAtSystemUtc` | `string or null, UtcInstant` | Nullable service identifier plus receipt time |
| `aircraft`, `route`, `flightIdentifiers` | `ReturnedAircraft, Route, FlightIdentifiers` | Relevant returned identities, normalized and checked against the request |
| `filedTimes`, `taxiInMinutes`, `cruiseAltitude` | `FiledTimes, number or null, Altitude or null` | Nullable verified planning data with explicit event basis and units |
| `plannedPassengers`, `fuelAndWeights` | `integer or null, FuelAndWeights` | Returned planning values and units, not aircraft loading or actual uplift |
| `validationIssues` | `ValidationIssue[]` | Capacity/association/field validity findings; never silently clamp SimBrief values |
| `documentReference` | `DocumentReference or null` | Optional rotation-scoped document reference; no assumed permanent service URL |

Fuel fields must distinguish next-leg block fuel, inbound planned burn and estimated arrival fuel, with destination/alternate basis and source association. Exact mapping is deliberately left to PRE-02/question 22; missing values remain null, with explanatory availability metadata where needed. An association mismatch cannot become the leg's current OFP. Whether a returned capacity violation blocks further dispatch use is not settled by inventing a new validity enum; follow the eventual verified validation policy under M08.

Retain results needed by current operations, completed-leg history and known-successful workflow markers. No full superseded-plan archive or request/result graph is needed solely to explain old messages. Recovery resets remaining generated preparation while retaining Scheduled values and self-contained ACARS audit history. Required live references still resolve; prune unreferenced records and optional documents after the committed change. Ordinary edits may leave an existing OFP visibly Out of date until explicit regeneration.

An already-started rotation, including an accepted recovery leg, can continue monitoring if planning fails; unavailable planning figures stay unavailable. First startup still requires a matching OFP. No new ordinary attempts once airborne, but a matching already-sent result may attach without resetting events.

## Messages and Hoppie submissions

**Message** contains `id`, `kind` (`automaticPreliminary` or `requestedUpdate`), `aboutLegId`, a frozen upcoming-flight identity/route summary, `inboundLegId`, `recipientCallsign`, frozen `senderCallsign` using the preferred `AD<current inbound ATC callsign>` format subject to DEC-055 validation, immutable `body`, nullable `sourcePlanningRevision` and `sourceResultIds` as audit labels rather than required retained records, `createdAtSimulatorUtc` where valid, `createdAtSystemUtc`, local `read`, and `submission`.

`submission` contains `state` (`notSubmitted`, `possiblySent`, `accepted`, `definitiveFailure`, `uncertain`), a local attempt token/count, optional safe service reference/error, and system-time attempt/acceptance timestamps. Not configured or transmission disabled leaves it not submitted; the current reason is derived from settings. It is not a mandatory delivery backlog. Whether enabling Hoppie later offers submission of existing messages is separate UI/policy work, not automatic behaviour introduced here.

Create the message and its automatic-message marker together before submitting. Acceptance ends retries. Local read/unread never means cockpit read, delivery or acknowledgement. Freeze both sender and inbound recipient callsigns even if the next leg subsequently activates. Under DEC-055, an explicit callsign-conflict rejection permits bounded delayed retries of this same message; ambiguous outcomes must not cause blind retries. Retry timing, limits and expiry/cancellation remain PRE-06 design work; exhaustion preserves the local log without blocking the rotation. Ordinary edits do not rewrite a previously generated message or cause another automatic one. Accepted recovery resets remaining workflow markers and may generate a fresh automatic message, while retaining original messages and outcomes. Historical submissions cannot resume retries or suppress the rebuilt workflow's message. Do not apply SimBrief's retry budget to Hoppie.

**Removal and retained history (DEC-051 as simplified by DEC-057):** when an unflown leg is explicitly removed, retain generated message content for the rotation lifetime. Its frozen identity/route summary explains the message without retaining a hidden operational leg. Apply all cleanup in the same snapshot as the removal:

- Allow eligible removal during subsequent generation; invalidate affected outstanding work and reconcile live references atomically under DEC-058. The first-generation overlay still blocks interaction.
- Retain original messages with frozen identity/route, body, timestamps, sender/recipient and submission outcomes. Discard unneeded planning records; messages and retained schedule baselines must remain understandable without live links to discarded requests/results. External document cleanup follows snapshot publication.
- Allow historical identifiers in messages to refer to removed legs or discarded revisions/results. Live current-plan, handover, arrival-dispatch and recovery-hold targets must still resolve; copied `sourceRuleId` and schedule/message provenance IDs are historical labels, not live foreign keys; no hidden operational leg is retained.
- Reconcile live handover/target references and airport continuity before committing. Removing a target must not silently release an existing manual-reposition or arrival-recovery hold; retain the originating hold and require the applicable explicit recovery choice/Resume for its valid replacement target. Reject the edit if no valid reconciliation is available.
- Retained records cannot make a removed leg eligible, produce another automatic message, submit another network request or recreate it from a late callback. Historical success evidence is not a queue.

## Preferences and reusable rules

The preferences payload contains:

- Dispatch defaults: automation controls, proximity threshold (accepted default 20 minutes), default turnaround, taxi-in fallback and optional weight-unit preference. Other numerical defaults are not invented here. The exact mapping of the PRD's general and arrival automation controls should avoid redundant flags.
- Presentation/notifications: local-time display preference and message/OFP/failure notification choices. Persisting the board preference does not move its control into Settings.
- `turnaroundRules`: `{ id, callsignPrefixes, turnaroundMinutes, airlineId }`, with nullable airline membership.
- `airlines`: `{ id, name, icaoCode, iataCode }`, optional identity grouping; rule values are owned once by turnaroundRules rather than duplicated in airlines.
- Non-secret integration account identifiers/references and Hoppie-enabled preference. No authentication tokens or logon keys.

One rule can match EZY and EJU without an airline record. A per-leg override wins over a matched rule, which wins over the default. Use the longest matching prefix and reject equally specific conflicting rules. Prefix comparison uses normalized uppercase values. Applying changed profiles to existing editable legs is explicit; completed history never resolves values again from these mutable rules. Credentials follow the authoritative DEC-050 main-process storage boundary; domain objects contain no platform secret-store handles.

## Derived/transient state and validation

Do **not** persist additional authoritative copies of: editability, active-leg ID, next eligible leg, Out of date flag, UI dispatch label, unread count, timing status/colour, readiness estimate or handover due time. Derive them from the fields above. Out of date compares the associated result's input revision with the leg's effective planning revision. Domain rules still distinguish known result success from present freshness.

Keep live telemetry, freshness/session sequences, connection/authentication health, short confirmation windows, network timeout handles and UI selection transient. Persist only confirmed detector context necessary to resume; a saved phase/engine reading cannot prove current readiness. No telemetry samples are required to rebuild the rotation.

Validate these invariants on commands and snapshot load:

1. At most one working rotation and one Active leg; no Active leg in an unstarted rotation.
2. Current operational references resolve within the same rotation; IDs are unique. Historical message identifiers may refer to removed legs or discarded planning records under DEC-057; frozen message context remains readable and cannot drive operational actions.
3. Current-leg editing requires parked/engines-off telemetry and no established airborne flight; a pre-flight return to gate can reopen it. Airborne/completed planning remains locked. Request completion cannot reset departure/actuals or override these conditions.
4. Completed means valid after-flight grounded/stationary/all-engines-stopped completion, not just phase PARKED. Missing touchdown remains allowed.
5. First successful matching operational OFP gates commencement; normal later handover has no new OFP prerequisite. Accepted recovery immediately activates the fresh leg at approval time, with no turnaround or ten-minute wait.
6. One automatic message per eligible subsequent-leg workflow; none for the initial leg. Accepted recovery resets remaining preparation and permits fresh workflow messages while retaining all prior messages. Ordinary edits/restarts do not reset this allowance; accepted Hoppie messages never resend.
7. Actual times are independent and non-editable. Do not reject recorded history merely because a manual simulator-clock change makes timestamps non-monotonic; planning-time conflicts are validated separately.
8. Clearing removes all rotation-owned state in one snapshot, preserving preferences/credentials. Stale callbacks cannot repopulate it.
9. Eligible ordering edits invalidate affected request revisions/context atomically, preserving continuity and holds. Old responses cannot attach plans, create messages or dispatch after reset/removal.
10. A SimBrief cycle has at most four attempts and adopts one valid matching result; restart retains budget/outcome. Explicit Retry starts a fresh budget after exhaustion. Uncertain Hoppie outcomes never trigger blind resend.
11. Diversion intent and all recovery holds restore from working state; elapsed time or aircraft movement cannot release them.

## Commands and persistence boundary

DEC-060 requires enum commands with command-specific typed, runtime-validated payloads. The backend checks eligibility and current identity/revision/context, builds a complete next state, commits it transactionally, then publishes its snapshot and initiates dependent effects. Capture time/identifiers once for deterministic execution; duplicate command delivery must not repeat the committed action. This is command idempotency, not business version history. The [IPC contract](docs/architecture/ipc-contract.md) specifies command payloads, replies and duplicate handling. Executable validators will be implemented and tested during authorised development.

Save failure shows an error, retains committed state and sends no dependent request; no unsaved operational mode. Form input may remain available for retry without being represented as saved. Unreadable working state is preserved with a recovery error and a fresh-rotation option. Settings/credentials are separate. JSON remains preferred pending bounded validation; SQLite is fallback if unsuitable. No automatic backend-restart or heartbeat framework is added.

## Concrete review examples

| Situation | What changes / what stays |
|---|---|
| Completed A used registration G-AAAA; shared configuration changes to G-BBBB | Rotation default and eligible B/C planning copies change; A and old request snapshots retain G-AAAA. If B is generating and otherwise editable, invalidate its old request revision; do not rewrite submitted inputs. |
| Scheduled 13:00; returned Filed 13:20; observed Actual 13:23 | Store all three independently; derive +23-minute actual departure deviation. |
| B departs while its OFP is pending | Taxi-out closes editing and established airborne flight locks it permanently. Request retains submitted revision; a matching response updates OFP/Filed without clearing actuals or overriding editability. |
| A completes at 14:00Z; B departs at 14:06Z | Consume A→B handover and activate/lock B in one save. The derived 14:10 deadline later does nothing. |
| Hoppie accepted a message, then the app restarts | Accepted submission and automatic-message marker restore; no resend. A lost unsaved outcome instead restores uncertainty. |
| Final normal leg completes | Envelope retains its format/revision but rotation becomes null. Preferences and secret storage survive. |
| Remove a pending leg after its preliminary message/result exists | Remove the operational leg; retain the original message with self-contained context; discard unneeded planning provenance. The snapshot reloads successfully, historical leg IDs do not recreate the leg, and no further dispatch occurs for it. |
| Insert/reorder a leg ahead of the target of an unresolved planning request | Permit an otherwise valid edit during subsequent generation, invalidate affected context/revisions and disregard the old response. Startup overlay still blocks edits. |
| Taxi out, then return to gate and shut down before flight | Reopen planning edits; retain off-block/actuals. A planning change invalidates OFP and requires explicit regeneration. Airborne history would prevent reopening. |
| Declare C during A → B, then cancel before touchdown | Preserve planned B; pause onward workflows, then resume from the paused point without repeating known success. |
| Divert to C, shut down at 14:00, accept C → B at 14:25 | Save fresh leg/activation/reset/hold resolution together; requested off-block is 14:25. Default EZY1234 to EZY123R, IATA unchanged. Preserve original A → B with actual C and ACARS history. |
| Reset B → D preparation after accepting C → B | Keep B → D inputs/schedules and all messages, discard generated preparation, reject late old responses; a fresh workflow may issue a new automatic message. |
| No usable OFP through four attempts | Preserve inputs and show Retry; a manual retry starts a fresh budget. First startup remains unstarted; an already-started rotation can continue monitoring. |

This draft can be reviewed without settling every external field. Provider-specific SimBrief inputs/outputs and retry timing remain PRE-02 adapter work; aircraft detector thresholds/context remain PRE-04 prototype work. These extension points do not leave core ownership or local message contracts unspecified. Product retry/retention/editing policy is settled by DEC-056–060; storage reliability remains unproven. JSON integrity/commit details remain in the persistence proposal. Early authorised development will implement validators and the flight-monitoring harness, then validate the writer/restart cases under DEC-061; none are implemented here.

## Explicit nested records and storage format

This notation defines documentation types, not production TypeScript. All listed fields are required on stored objects; `T | null` represents absent/unknown data, and collections are empty rather than null. Commands use the explicit input DTOs in the IPC contract; they do not accept persisted entities or arbitrary patches. JSON has no undefined, NaN or Infinity. Enum strings are case-sensitive. IDs are nonempty opaque strings; revisions are nonnegative safe integers. `UtcInstant` is ISO 8601 UTC with full date and Z suffix; `DateOnly` is YYYY-MM-DD. Airport ICAOs are trimmed uppercase identifiers validated against the supported airport source; callsign/provider restrictions are checked by the relevant integration, not invented from the recovery naming default.

```text
Id = string
Revision = integer >= 0
WeightUnit = kg | lb
LegLifecycle = pending | active | completed
FlightPhase = departing | takeoff | climb | cruise | descent | finalApproach | landed | parked
PlanningKind = advancePreparation | operationalOfp
PlanningState = prepared | possiblySent | succeeded | definitiveFailure | unusable | uncertain
Weight = { value: number >= 0, unit: WeightUnit }
FuelInput = { kind: weight, value: Weight } | { kind: minutes, value: number >= 0 }
Altitude = { value: number, unit: ft }
Route = { originIcao: AirportIcao, destinationIcao: AirportIcao }
FlightIdentifiers = { atcCallsign: string, iataFlightNumber: string | null }
ScheduleBaseline = { atUtc: UtcInstant, source: manual | firstFiled, originatingResultId: Id | null }
FiledTime = { atUtc: UtcInstant, ofpId: Id }
FiledTimes = { offBlockUtc: UtcInstant | null, onBlockUtc: UtcInstant | null,
               landingUtc: UtcInstant | null }
ResolvedTurnaround = { minutes: number >= 0, source: override | prefixRule | default,
                       sourceRuleId: Id | null }
FuelOptions = { atc: FuelInput | null, weather: FuelInput | null, mel: FuelInput | null,
                extra: FuelInput | null, contingency: FuelInput | null, finalReserve: FuelInput | null }
AircraftConfiguration = {
  selection: { kind: catalogue, typeId: string, typeLabel: string,
               variantId: string | null, variantLabel: string | null }
           | { kind: savedAirframe, internalId: string },
  registration: string | null, maximumPassengers: integer >= 0 | null
}
ReturnedAircraft = { typeId: string | null, variantId: string | null,
                     registration: string | null, savedAirframeId: string | null }
Handover = { inboundLegId: Id, nextLegId: Id, completedAtSimulatorUtc: UtcInstant }
DiversionIntent = { legId: Id, intendedAirportIcao: AirportIcao }
ArrivalDispatch = { inboundLegId: Id, requestId: Id | null, shutdownObserved: boolean }
Arrival = { episodeId: Id, outcome: destination | return | diversion | unresolved,
            actualAirportIcao: AirportIcao | null, identificationSource: automatic | user | null }
RecoveryHold = { kind: arrivalAirportUnresolved | arrivalRecoveryChoice,
                 inboundLegId: Id, nextLegId: Id | null }
             | { kind: manualRepositionAwaitingResume, inboundLegId: Id, nextLegId: Id }
PhaseContext = { operatingAltitudeFeet: number | null }
EligibilityContext = { startupFirstLegId: Id | null, inboundLegId: Id | null, targetLegId: Id }
SubmittedInputs = { planning: LegPlanning, requestedOffBlockUtc: UtcInstant | null,
                    timingBasis: schedule | inboundReadiness | recoveryApproval | unavailable,
                    inboundPlanId: Id | null, inboundGateUtc: UtcInstant | null,
                    taxiInMinutes: number >= 0 | null, turnaroundMinutes: number >= 0,
                    targetServicePlanReference: string | null }
SafeError = { code: string, message: string }
ValidationIssue = { field: string, code: string, message: string }
DocumentReference = { id: Id, mediaType: string }
FuelAndWeights = { blockFuel: Weight | null, plannedBurn: Weight | null,
                   estimatedArrivalFuel: Weight | null, alternateFuel: Weight | null,
                   arrivalBasis: destination | alternate | null,
                   arrivalAirportIcao: AirportIcao | null }
```

`diversionIntent != null` itself imposes the declared-diversion hold; do not also persist an independently mutable duplicate `declaredDiversion` entry. RecoveryHold stores the other holds. `PhaseContext` is the bounded operating-level reference for the proposed detector; unused means null. Confirmed phase/airborne/arrival facts already live in OperationalFacts. Additional detector state requires a reviewed schema change based on the harness, not an arbitrary data bag. Missing service fields remain null; adapters normalize event basis/units and report validation issues. `FuelAndWeights` names are local concepts, not claimed vendor fields. No live uplift or aircraft FMS prediction is added.

`SimBriefOptions` is an empty record in contract v1: the already named route, aircraft, fuel and timing inputs are modelled above. PRE-02 may add individually typed supported options in a reviewed revision; no arbitrary JSON passes through to the provider. Catalogue mapping, fuel duration support and returned-field semantics still require provider evidence. `DocumentReference.id` is resolved by the backend to rotation-scoped local content; renderers cannot supply filesystem paths. No service URL is assumed permanent.

**Message and submission fields**

| Field | Type | Rule |
|---|---|---|
| `id`, `aboutLegId`, `inboundLegId` | `Id` each | Stable original associations; historical leg IDs may no longer resolve. |
| `kind` | `automaticPreliminary or requestedUpdate` | No arbitrary outgoing messages. |
| `flightContext` | `{ route: Route, identifiers: FlightIdentifiers }` | Frozen upcoming-flight description. |
| `senderCallsign`, `recipientCallsign`, `body` | `string` each | Frozen at creation; safe plain text. |
| `sourcePlanningRevision`, `sourceResultIds` | `Revision or null`, `Id[]` | Historical labels, not required live references. |
| `createdAtSimulatorUtc`, `createdAtSystemUtc` | `UtcInstant or null`, `UtcInstant` | Simulator clock may be unavailable. |
| `read` | `boolean` | Local log only. |
| `submission` | `Submission` | Mutable outcome/accounting; body remains immutable. |

```text
Submission = { state: notSubmitted | possiblySent | accepted | definitiveFailure | uncertain,
               attemptToken: Id | null, attemptCount: integer >= 0,
               lastAttemptAtSystemUtc: UtcInstant | null, acceptedAtSystemUtc: UtcInstant | null,
               serviceReference: string | null, failure: SafeError | null,
               retryAfterSystemUtc: UtcInstant | null, retired: boolean }
```

`retired` prevents a historical message from sending/retrying after removal or recovery reset, without changing its known submission outcome. Accepted messages have a non-null acceptance time and never retry. Uncertain submissions have no scheduled retry. PRE-06 supplies confirmed-rejection retry delay/limit; it is not the SimBrief limit. Initially `notSubmitted`, count 0, nullable fields null, retired false. Message creation and its automatic marker commit together.

PlanningRequest additionally has `retryAfterSystemUtc: UtcInstant | null`. Its `id` identifies one generation cycle; manual Retry creates a new ID. Initially prepared/count 0, no token/outcome times/result. Before each send commit count+1, a new token, last-attempt time and possiblySent. At most four sends per cycle. Failure/unusable/uncertain describes the last attempt; non-null finishedAt with no result means the cycle is exhausted or stopped. A usable success sets succeeded/resultId/finishedAt and removes retry time. Edits/reset remove obsolete requests rather than retaining a cancelled-history graph. Results carry requestId as provenance; only current-work references must resolve. A known success marker cannot be pruned while it still prevents an unintended repeat.

The backend reserves a request and approval-time inputs in the same transaction as AcceptRecovery. Retrying that request retains the original requested off-block; a new user cycle resolves latest confirmed inputs and eligible timing. Only AcceptRecovery captures a recovery approval; ordinary Retry does not release a hold or reactivate a leg. When held, do not issue due retries; on resumption recheck current context/eligibility rather than replay missed timer ticks.

**Editable command input**

```text
LegPlanningInput = { originIcao: AirportIcao, destinationIcao: AirportIcao,
                     atcCallsign: string, iataFlightNumber: string | null,
                     flightDate: DateOnly, scheduledOffBlockUtc: UtcInstant | null,
                     scheduledOnBlockUtc: UtcInstant | null,
                     turnaroundOverrideMinutes: number >= 0 | null,
                     fuelOptions: FuelOptions, weightUnitPreference: WeightUnit | null,
                     simBriefOptions: SimBriefOptions }
```

The backend supplies effective aircraft and resolved rule provenance, IDs and revisions. On edit, unchanged Scheduled values retain their source; changed non-null values become manual, null clears an optional baseline subject to planning validation. The renderer cannot claim a firstFiled source, set actuals or manufacture OFP references. On creation/recovery, resolve aircraft from the rotation's common configuration and rule defaults; a changed shared aircraft is an explicit UpdateAircraft command. During recovery the requested off-block is approval time, independent of an editable Scheduled target.

**Envelope and preferences**

```text
WorkingState = { schemaVersion: 1, revision: Revision, savedAtSystemUtc: UtcInstant,
                 rotation: Rotation | null, lastCommand: CommandReceipt | null,
                 integrity: { algorithm: sha256, digest: string } }
Preferences = { schemaVersion: 1, revision: Revision, lastCommand: CommandReceipt | null,
                automaticPlanningEnabled: boolean, automaticArrivalEnabled: boolean,
                proximityMinutes: number > 0, defaultTurnaroundMinutes: number >= 0,
                fallbackTaxiInMinutes: number >= 0, weightUnitPreference: WeightUnit | null,
                showLocalTimes: boolean, hoppieEnabled: boolean,
                notifications: { acars: boolean, ofpSuccess: boolean, ofpFailure: boolean,
                                 connectionFailure: boolean },
                turnaroundRules: TurnaroundRule[], airlines: AirlineIdentity[],
                simBriefPilotId: string | null }
TurnaroundRule = { id: Id, callsignPrefixes: string[], turnaroundMinutes: number >= 0,
                   airlineId: Id | null }
AirlineIdentity = { id: Id, name: string, icaoCode: string | null, iataCode: string | null }
```

`automaticPlanningEnabled` gates automatic preparation/generation; `automaticArrivalEnabled` additionally gates arrival/shutdown generation. Manual eligible generation remains available. Local-time preference stays a Rotation control. Only the 20-minute proximity default is an accepted product default; other initial preference values must be supplied by setup/configuration rather than fabricated as agreed defaults. Prefixes are nonempty uppercase, rule arrays have no duplicates; equal-specificity conflicting matches are rejected. Profile edits affect future defaults; applying to existing editable legs is a separate explicit command. Airline references resolve; deleting an airline must explicitly detach its rules, never silently delete them.

Encode working state as UTF-8 JSON. Integrity covers the envelope excluding `integrity`, using recursively lexicographically ordered object keys, preserved array order, compact JSON and no trailing newline in hash input. The file may be pretty-printed; validation reconstructs that canonical input. Reject duplicate JSON keys, malformed/non-finite numbers, unknown fields/enums and invalid references. A checksum is accidental-damage detection only. Verify exact encoding/Windows replacement in the prototype; this is not cryptographic authentication or a durability result.

Schema v1 loads only v1. Unsupported versions preserve the file and report recovery error; future versions require an explicit copy/validate/transactional migration, never an implicit downgrade. CommandReceipt is defined in the IPC contract. A fresh store initializes revision 0, rotation null, receipt null; subsequent successful writes increment revision once. Clearing retains the envelope but removes rotation content. Settings and secret storage are independent: no cross-file operation is represented as a single transaction.

## Reference and reset matrix

| Change | Keep | Invalidate/remove together |
|---|---|---|
| Ordinary planning edit | Leg identity, actuals, Scheduled unless explicitly edited, all messages | Affected requests/revisions; mark existing OFP out of date; explicit regeneration only. |
| Airport/order change | Completed history, user inputs, original messages | Affected inbound/target context and dependent preparation; reconcile continuity/holds. |
| Cancel diversion before touchdown | Paused current work and success markers | Intent only; other holds remain. |
| Accept recovery | Completed legs/results, remaining input/schedules, original messages/outcomes | Remaining generated preparation, obsolete request references, Filed pointers to discarded results, workflow markers; retire prior-workflow submissions. |
| Remove eligible unflown leg | Original frozen messages for rotation lifetime | Operational leg, unused plans/requests and live references; reject if holds cannot be safely reconciled. |
| Clear/replace rotation | Preferences and credentials, envelope revision/command receipt | Entire old rotation and its document associations; no old callbacks may apply. |

This contract closes local field ownership and reference rules. PRE-02 owns verified provider mapping/retry timing, PRE-04 owns measured detector rules, PRE-06 owns Hoppie retry/format compatibility, and the [prototype plan](docs/testing/strategy.md#early-development-prototype) owns executable validation. Those dependencies must not be represented as passed by closing design issue #20.
