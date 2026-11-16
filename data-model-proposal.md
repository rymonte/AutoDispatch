# AutoDispatch — proposed data model

**Review draft, amended 16 November 2026.** DEC-056–060 accept the simplified behaviour described here; field names and concrete storage/IPC schemas remain proposals. No implementation or validation gate is approved by this document. Read the authoritative [PRD](prd.md) and [domain/persistence proposal](domain-persistence-proposal.md).

## Model and lifetime

One Rotation owns ordered FlightLegs and ACARS Messages. A stable leg identity survives planning edits. The current planning revision rejects obsolete results; it is not a saved copy of every past leg. No rotation-version browser, full historical planning graph or rollback system is needed.

| Object | Minimum content / responsibility |
|---|---|
| WorkingState envelope | Schema version, committed snapshot revision, system save time, nullable rotation and adapter-owned integrity metadata. Clearing writes rotation null. |
| Rotation | Unique ID, started flag, shared aircraft defaults, ordered legs, messages, current planning work, normal handover and explicit holds/intent. |
| FlightLeg | Stable ID; Pending/Active/Completed; planning revision and current inputs; current OFP/advance associations; operational facts; current preparation workflow markers. |
| Message | Original leg association, immutable body and frozen flight context, sender/recipient, clock-labelled timestamps, local read state and submission outcome. Owned by rotation, not deleted by leg edits. |
| Planning work | Only current request/cycle state, frozen inputs, revision/context, attempts and retained result needed for operation. Discard invalidated preparation; no archive required solely for old messages. |
| Preferences/profiles | Separate versioned file; defaults and reusable rules survive rotation clear. |
| Credentials | Separate secure storage through main-process safeStorage; ordinary JSON holds only non-secret metadata/references. |

Pure domain modules define/validate transitions and ports. The utility-process persistence adapter owns file encoding, checksums and writes. Renderer snapshots are display data, not writable domain objects. Main routes validated IPC and credential operations (DEC-050).

## Values and revisions

- IDs are opaque and stable, never array offsets, callsigns or airport codes. New rotation/recovery-leg identities are unique.
- Event instants are full UTC values with simulator/system clock identified. Flight date is separate; unknown is null, never zero or an invented timestamp.
- Durations have explicit minutes; weights/fuel retain returned kg/lb units and supported tagged minute inputs. Validate finite values and actual provider semantics.
- A committed snapshot revision orders saved state. A leg planning revision changes when relevant inputs change. Capture inbound/target context as needed to reject obsolete results after route edits or recovery reset. Exact encoding is a schema detail; do not add business version objects or historical copies.
- Routine telemetry and read/unread changes are state updates, not new leg-planning versions. Carry the original message association and frozen context through edits, without duplicating the message.
- Duplicate IPC delivery must not repeat a committed transition. Command correlation/idempotency is distinct from planning revision; its bounded representation remains concrete contract work.

## Rotation and planning

Rotation contains id, started, aircraft, ordered legs, messages, current planning work, optional handover and holds. Derive Active from leg lifecycle (at most one); do not store a competing active-leg pointer. Normal handover holds inbound/next-leg IDs and completion simulator UTC; derive its ten-minute deadline. Recovery acceptance instead activates the new leg immediately, with no timer or turnaround allowance.

LegPlanning contains planned origin/destination ICAO, ATC callsign, optional IATA flight number, flight date, effective aircraft copy, Scheduled off/on-block baselines, resolved turnaround, supported fuel options, optional weight-unit preference and explicitly mapped SimBrief options. No unvalidated generic options bag.

Aircraft configuration supports catalogue/manual selection or optional saved-airframe reference, registration and passenger ceiling. Returned aircraft details remain evidence of what SimBrief used; saved-airframe override semantics remain PRE-02. Shared edits copy into operationally eligible legs, increment affected revisions and invalidate obsolete work without changing completed/airborne history. Profile application/longest-prefix precedence remain proposals.

A Scheduled baseline carries time and source (manual or first Filed); the value/source survives preparation reset even when its old plan is discarded. It need not retain a live reference to discarded PlanResult data. Preserve all Scheduled baselines by default, allow eligible edits, and keep fresh Filed values separate. First-Filed initialization must not immediately make its own OFP stale. Actuals are never user-editable.

Future pending legs remain editable during flight and background generation. Current edits require fresh on-ground/stationary/all-engines-off telemetry. Engine start/taxi-out closes editing; pre-flight return to gate reopens it. Established airborne flight/completion makes the lock permanent. First-generation overlay blocks interaction; subsequent generation alone does not lock inputs.

An affecting edit invalidates request revision/context and marks affected plans Out of date. Airport changes require explicit regeneration from the earliest viable leg and invalidate dependent downstream preparation. No automatic generation merely from editing. A matching already-sent result may attach after departure without changing lifecycle or actuals.

Keep live telemetry, connection freshness, short confirmation windows and UI selection transient. Derive editability, Out of date, unread count and readiness from facts rather than storing independent authoritative flags. Persist only confirmed detector context needed to resume; last-known readings never prove current readiness.

## Operational facts and recovery holds

Operational facts retain phase, departure observed, airborne established, independent nullable off-block/liftoff/touchdown/on-block actuals, Filed values with current OFP association, actual arrival/outcome and only bounded confirmed detector context required by PRE-04. Departure observed is history, not by itself a permanent edit lock: DEC-058 permits pre-flight return-to-gate editing. Recovered airborne context establishes the permanent lock without fabricating missed times.

Arrival outcome is destination, return, diversion or unresolved, with actual airport and evidence source when known. Intended diversion ICAO is separate from planned destination and actual arrival. Holds distinguish declared diversion intent, unknown arrival airport, recovery choice and manual reposition awaiting Resume. Clearing one must not clear another.

Declared intent can change/cancel before confirmed touchdown. It pauses onward work; it does not stop monitoring or UTC. Preserve enough paused work to resume on cancellation. Actual arrival determines the same recovery path whether intent was declared or not. After valid stationary/full-shutdown completion, offer recovery; never resume from elapsed time or movement alone.

AcceptRecovery commits a fresh ordinary leg and immediate activation, hold resolution, preparation reset and approval-time requested off-block together. Callsign default is original first up-to-six characters plus R; IATA stays unchanged. No permanent recoveryOf link/subtype. Preserve original planned route and completed actuals. Use actual arrival at the boundary to remaining legs; planned airports connect future legs. Intentional gaps require manual reposition/Resume.

Reset remaining generated preparation on acceptance, keeping user inputs, schedules and original ACARS audit messages. Historical messages cannot restart submissions or suppress a fresh automatic message for the new workflow. This reset is distinct from cancellation of intent, which resumes paused work. Restore holds/intent from working state after restart.

## Requests, results and retry cycles

Current request data includes local ID, rotation/leg IDs, planning revision, captured inbound/target context, frozen submitted inputs and timing provenance, kind (advancePreparation or operationalOfp), cycle/attempt correlation and count, outcome, safe error and optional service/result reference. Operational plans are not separate types for primary/shutdown/manual triggers. Initial acknowledgement is not an OFP.

The generation workflow records prepared/possibly-sent/usable-success/no-usable-result knowledge without pretending timeout proves remote failure. Persist the initial-plus-three retry budget and outcome across restart. Manual Retry begins a fresh cycle with latest confirmed inputs. Select one usable matching success and stop unsent retries; obsolete/additional responses have no effects. SimBrief duplicate remote plans are accepted on retries for missing/unusable results (DEC-059). No assumed cancellation or provider idempotency.

PlanResult retains normalized identities, planning revision/context, optional service reference, receipt time, Filed/taxi/cruise data, passenger/fuel/weight fields with explicit units and availability, validation issues and optional document reference. An association mismatch cannot become current. Passenger-capacity disposition and exact provider fields remain PRE-02; do not silently clamp returned values or invent fuel figures.

Retain plans required by current operations and completed history. Reset remaining preparation without retaining old results solely as message provenance. Ordinary edits may display an existing OFP as Out of date; accepted recovery discards superseded remaining generated data. Delete optional unreferenced documents only after successful snapshot publication. No orphan document or callback may recreate a leg/rotation.

Once the rotation has started, planning failure does not stop monitoring or require an OFP for recovery-leg activation. First startup still requires a matching successful OFP. No new ordinary attempts after airborne flight; already-sent matching results can attach.

## Rotation-owned ACARS history

Message fields include id, kind (automaticPreliminary/requestedUpdate), original about-leg and inbound-leg IDs, frozen flight identifiers/route, sender/recipient, immutable body, creation simulator/system timestamps where valid, local read state, and submission state/attempt accounting. Historical leg/revision identifiers are audit labels, not required foreign keys to a retained leg-version graph. The message must remain understandable if its leg is edited/removed or preparation discarded.

Hoppie outcomes distinguish not submitted, possibly sent, accepted, confirmed rejection and uncertain. Keep frozen identities/content across allowed retries. Positive acceptance stops retries; uncertain acceptance never triggers blind resend. Confirmed rejection retry bounds remain PRE-06, not the SimBrief budget. Local read is not cockpit read/delivery.

Persist message creation and the current workflow's automatic-message marker together before sending. No first-leg preliminary message. Normal edits, threshold crossings, final generation or restart do not produce another automatic message. Accepted recovery resets the remaining workflow marker while preserving original messages, permitting a fresh automatic message. Mark retained prior-workflow submissions inactive for future sends without erasing their known outcome. No mandatory eventual-delivery queue.

Removing an eligible leg reconciles live references and holds and invalidates its pending work in the same transaction. Historical messages remain, without a hidden leg or terminal request/result graph. All live handover/hold/current-plan targets must resolve. Historical content cannot dispatch or resurrect removed entities.

## Preferences and reusable rules

The preferences payload contains:

- Dispatch defaults: automation controls, proximity threshold (accepted default 20 minutes), default turnaround, taxi-in fallback and optional weight-unit preference. Other numerical defaults are not invented here. The exact mapping of the PRD's general and arrival automation controls should avoid redundant flags.
- Presentation/notifications: local-time display preference and message/OFP/failure notification choices. Persisting the board preference does not move its control into Settings.
- `turnaroundRules`: `{ id, callsignPrefixes, turnaroundMinutes, airlineId }`, with nullable airline membership.
- `airlines`: `{ id, name, icaoCode, iataCode }`, optional identity grouping; rule values are owned once by turnaroundRules rather than duplicated in airlines.
- Non-secret integration account identifiers/references and Hoppie-enabled preference. No authentication tokens or logon keys.

One rule can match EZY and EJU without an airline record. A per-leg override wins over a matched rule, which wins over the default. Longest matching prefix with rejection of equally specific conflicting rules remains a proposal. Applying changed profiles to existing editable legs is explicit; completed history never resolves values again from these mutable rules. Credentials follow the authoritative DEC-050 main-process storage boundary; domain objects contain no platform secret-store handles.

## Storage, IPC and validation

Related changes save as one complete snapshot. Build/validate, commit, then publish and execute dependent effects. Reads and repeated commands must be deterministic for captured inputs and idempotent; exact command enum members/payload schemas remain implementation design work. Runtime validation is required at IPC boundaries. No speculative backend restart/heartbeat system is introduced.

On save failure, show an error, retain committed state and send no dependent request. No unsaved operational mode. Preserve UI draft input for retry where possible. If load fails, preserve working-state data, show a recovery error and offer a fresh rotation. Settings/credentials are separate. JSON is preferred subject to bounded writer validation; SQLite is fallback. Full protocol and evidence limitations are in the persistence proposal.

Validate these invariants on commands and load:

1. One rotation, at most one Active leg; first commencement needs its OFP. Recovery acceptance requires an already-started rotation and immediately activates its fresh leg.
2. Live references resolve; historical message identifiers may refer to removed legs. Old callbacks cannot create effects after edits/reset/clear.
3. Current-leg editing requires fresh parked/engines-off conditions and no established airborne flight. Actuals/history cannot be reset by edits or RTO.
4. Completion requires established after-flight context and valid grounded/stationary/engines-off observation. Missing touchdown stays unknown.
5. Intent/unknown-airport/recovery/Resume holds persist and are not released by timers, relocation or restart.
6. One automatic message per workflow; accepted recovery may reset that workflow while retaining original messages. Accepted Hoppie messages are never resent.
7. Scheduled/Filed/Actual stay distinct. Reset retains Scheduled by default; non-monotonic simulator UTC after a manual clock change does not invalidate recorded history.
8. Clear/replacement is atomic and durable within the validated failure scope; callbacks and orphan files cannot revive discarded rotations.
9. A generation cycle adopts one valid result and has at most four attempts; restart does not reset its budget. Only explicit manual Retry starts a fresh budget after exhaustion.

Concrete executable schemas/tests await authorised implementation. Synthetic transition/IPC cases and separately authorised local writer interruption checks are described in the persistence proposal. No vendor capability or Windows durability result is claimed here.
