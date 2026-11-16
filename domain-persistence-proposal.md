# AutoDispatch — domain, state and persistence proposal

**Reviewed 16 November 2026.** DEC-056–060 record the product owner's accepted issue #20 review decisions. The concrete schema, IPC payload catalogue and JSON writer remain proposals requiring validation. DEC-046/050 boundaries remain accepted; this is not a development baseline or implementation authorisation.

Basis: [PRD v0.4](prd.md), M01–M06/M09/M14–M17, AC02/05/07/11–15 and PRE-02/04/05/06/09. Source: the product-owner review conversation, consolidated 16 November 2026. No live service, simulator or persistence validation was performed. The filesystem research below retains its original evidence dates and limitations.

## Minimal ownership model

One rotation owns ordered legs and original ACARS messages. Each leg has a stable identity, current planning inputs/revision, associated results and operational facts. Future-leg edits must not lose rotation message history. No full historical leg copies, route-version browser, event sourcing or durable general-purpose queue is required.

Pure TypeScript domain modules in the utility process own the rules and define ports. Integration adapters implement those ports for telemetry, services and persistence. Main stays thin: lifecycle, IPC routing, safeStorage credential operations and existing utility supervision. React submits commands and presents snapshots. Domain code imports no Node, Electron, React or concrete adapter code (DEC-050).

One backend coordinator serializes operational mutations, including the asynchronous save boundary. Adapters deliver observations/results; they do not mutate legs or initiate follow-on dispatch themselves. Maintain one owner per working-state store. Detailed implementation is deferred; do not add automatic process-restart/heartbeat infrastructure to this review. Backend unavailability is an error, not permission for renderer-owned state.

## Commands, snapshots and transactions

Accepted minimum (DEC-060):

- IPC commands use enum discriminants and command-specific typed payloads. Runtime validation and sender checks are still necessary; TypeScript types alone do not validate incoming IPC.
- The backend checks identity, current planning revision/context, operational eligibility and holds. Reads expose a complete committed snapshot, never a half-applied recovery action.
- Capture time and identifiers once for an action. Applying the same captured command twice must not create two legs, two local planning cycles or repeated effects. Concrete command-ID/revision encoding remains a schema detail, not a new business-version system.
- Build and validate the complete next state; persist it transactionally; then publish success and initiate dependent external effects. A save failure reports an error and does not adopt an unsaved operational state. Uncommitted form input may be retained for retry without pretending it is saved.
- Existing external work cannot be rolled back by a local transaction. Save its outcome when possible; if the result was lost across termination, follow the distinct SimBrief/Hoppie policies below.

Suggested enum members include StartRotation, EditLeg, DeclareDiversion, ChangeDiversion, CancelDiversion, AcceptRecovery, ResumeNextLeg, GenerateOfp, RetryGeneration, MarkMessageRead and ReplaceRotation. These names illustrate scope, not an implemented exhaustive enum. Payloads identify only the relevant entities and user inputs; the backend computes transitions. Security constraints remain in [architecture boundaries](docs/architecture/boundaries.md).

## Planning, editing and response association

First-leg generation blocks user interaction through a loading overlay while the backend remains responsive. A successful matching first OFP is mandatory for commencement. Subsequent generation runs asynchronously with a toast/loading indicator; otherwise eligible edits and Divert remain available.

Future pending legs remain editable. Current-leg edits require fresh grounded, stationary, all-propulsion-engines-off telemetry; APU/external power is allowed. Engine start/taxi-out closes editing. A return to gate before any established airborne flight reopens it, preserving original off-block/actuals. Once airborne, the planning lock is permanent through arrival and completion. RTO does not erase history, but a subsequent pre-flight parked return can permit editing. No separate TAXI-OUT phase is introduced.

Copy shared aircraft/profile values into eligible leg planning rather than letting mutable defaults rewrite completed history. An eligible edit during background generation increments affected planning revisions and invalidates obsolete requests; it does not reject the edit solely because generation is pending. Shared changes still cannot alter an operationally locked leg. Profile application/prefix precedence remains proposed policy, not settled by this review.

Airport edits to a confirmed plan require explicit regeneration from the earliest viable leg: current if eligible, otherwise next eligible. Invalidate affected downstream preparation; preserve entered planning and all Scheduled baselines by default. Filed updates from a fresh OFP do not reset Scheduled. Ordinary edits never automatically issue replacement generation. Readiness retains M05 gate/taxi/turnaround semantics except the explicit recovery approval-time filing rule.

Use stable rotation/leg identities, current planning revision and captured inbound/target context to validate responses. Recovery reset or an affecting edit invalidates old work at the response boundary; no remote cancellation is assumed. A still-matching response can attach after departure without resetting actuals. These are correlation guards, not stored historical leg versions. Ordinary handover alone need not invalidate a correctly associated result.

## Diversion and recovery

For A → B followed by B → D:

| Event | Required behaviour |
|---|---|
| Declare diversion to C | Preserve A → B; store intended C and pause onward planning, messaging/retries, activation and schedule progression. Monitoring/actuals continue. |
| Change or cancel before confirmed touchdown | Change intent, or explicitly resume the paused workflow on cancellation, subject to normal eligibility and unrelated holds. Do not repeat successful steps. |
| Result arrives during the intent hold | Do not use it for onward effects. Retain sufficient current-work outcome to resume if intent is cancelled. This is distinct from discarding preparation after recovery acceptance. |
| Land at C, with or without prior declaration | Actual reliably identified airport determines diversion. Complete inbound at stationary/full shutdown; offer C → B. No automatic resumption. |
| Return to A / land at original B / unknown airport | Return offers fresh A → B; original B resolves intent through normal arrival; unknown airport retains a confirmation hold. |
| Accept recovery C → B | In one transaction create and activate the fresh leg, resolve the recovery hold, reset remaining preparation and reserve fresh generation. Request off-block at approval-time simulator UTC; no turnaround or ten-minute wait. |
| Skip recovery | Create no flight; preserve manual-reposition hold until explicit Resume. Movement/loading/timers cannot release it. |
| Restart | Restore intent, holds and committed recovery acceptance from working state; fresh telemetry resumes monitoring, not automatic release of holds. |

Recovery creates an ordinary leg, no permanent lineage/subtype. Default ATC callsign is the first up-to-six characters of the affected flight's callsign plus R; EZY1234 becomes EZY123R. Copy optional IATA flight number unchanged. Planned/actual airport history remains separate. Continuity across completed history uses actual arrival; future-to-future continuity uses planned airports. An intentional gap requires the manual-reposition/Resume path.

Recovery acceptance preserves completed legs, remaining user inputs/identities, Scheduled baselines and all ACARS audit messages. Discard remaining generated preliminary/OFP data and obsolete request state. A small revision/context guard rejects discarded responses. Old messages remain history only: no retries and no suppression of a fresh message for the rebuilt workflow. Cancellation before touchdown instead resumes paused work; it is not a preparation reset.

## ACARS lifetime and external outcomes

The rotation owns immutable message content, original leg association and frozen flight/route context, sender/recipient, timestamps, local read state and submission outcome. Editing or removing a future leg never rewrites or loses its original messages. Historical leg IDs may no longer resolve; frozen context must keep the message understandable without retaining a hidden leg or complete request/result graph. All live operational references must resolve. Clearing/replacing the rotation ends its message history; it does not delete remote service data.

Ordinary threshold recrossings, final OFP generation and reconnects do not generate revised automatic messages. Recovery acceptance creates a fresh preparation workflow that can issue a new message, retaining previous messages for audit. This is the explicit DEC-057 exception to DEC-030; ordinary edits do not silently reset the message allowance.

| Service | Failure policy |
|---|---|
| SimBrief | One initial attempt plus up to three retries for no usable matching OFP, including lost response/timeout or corrupt output. Possible duplicate remote plans are accepted in this degraded case. Adopt one valid matching result, stop unsent retries, disregard obsolete/additional responses. Exhaustion preserves input and offers manual Retry with a fresh budget. Persist current-cycle accounting across restart. |
| Hoppie | Confirmed rejection may retry within bounded PRE-06 limits. Positive acceptance ends retries. Unknown acceptance after timeout/lost response never triggers blind resend. Frozen sender/recipient/content and the local log persist. Do not import SimBrief's three-retry policy. |

Record intent before send and outcome afterwards. A possibly-sent marker records uncertainty; local IDs are not service idempotency keys. Known committed success is never automatically repeated. No general-purpose delivery queue is required. Retry timing/backoff, provider limits and precise usable-response validation still require PRE-02/06 evidence. Do not create unlimited fallback cycles after exhaustion; the user Retry action is the agreed fresh-cycle path.

An already-started rotation can continue monitoring after OFP failure, including a recovery leg activated on approval. Missing planning-derived fuel/passenger/timing figures stay unavailable; actual fuel uplift remains outside MVP. The pilot may proceed. No new ordinary attempts are initiated once airborne, but a matching already-sent response may attach. First-leg startup has no bypass.

## Persistence comparison

Both options are local files. Neither implies a backend service.

| Concern | Structured snapshot with safe replacement | SQLite embedded database |
|---|---|---|
| Related changes | One complete versioned envelope can atomically represent rotation, actions and messages; splitting these among files creates coordination work | One transaction updates related records and deletes rotation data together |
| Interrupted writes | Write same-directory temporary file, flush, validate, replace, handle failure states; retain a validated fallback only with explicit freshness/clear rules | Journal recovery handles incomplete transactions, within documented OS/storage assumptions |
| Frequency / overhead | Entire envelope rewritten per durable transition; credible for one small rotation, but message/OFP growth increases writes | Changed records/pages written plus journal/sync overhead; no server process. Actual latency/resource advantage requires measurement |
| Recovery complexity | Application owns generation selection, checksums, replacement errors and safe handling of older copies | Application still validates domain/schema and uncertain actions; engine owns transaction rollback |
| Schema changes | Explicit envelope version, validation and copy/migrate/replace | Explicit schema/payload version and transactional migrations; SQL does not migrate domain meaning automatically |
| Diagnostics | Human-readable, but easy to edit into inconsistent state; redacted support export still needed | Inspection requires tooling; provide redacted structured support export and bounded logs |
| Packaging | Built-in serialization/filesystem APIs, possibly additional Windows replacement handling | SQLite binding/runtime support and deployment/licence checks; exact Electron Node version matters |
| Lifetime boundaries | Separate preferences file is practical, but current/backup rotation clearing needs careful ordering | Settings/profiles and rotation records share a file while remaining in separate deletion scopes |

Node documents that `writeFile` can perform multiple writes and concurrent writes must be serialized. Its `flush` option flushes file data; that alone is not a complete replacement/recovery protocol ([Node filesystem documentation](https://nodejs.org/api/fs.html)). Windows `ReplaceFileW` has documented partial-failure outcomes and does not support its `REPLACEFILE_WRITE_THROUGH` flag; do not claim “rename means power-loss safe” without validating the actual mechanism ([Microsoft ReplaceFileW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew)).

### Filesystem research finding — 15 November 2026

**Achievable in principle: yes. Demonstrated in the packaged app: not yet.** The rotation is a cohesive document loaded into memory, with one writer and no historical query workload. Microsoft explicitly describes writing a new file and replacing the original as an approach for document-like atomic updates. It separately cautions about maintaining consistency across structured datasets. Keeping the operational state together avoids that latter multi-file problem; this is a design inference, not Microsoft validation of AutoDispatch. Do not adopt Transactional NTFS: Microsoft recommends alternatives ([Microsoft guidance](https://learn.microsoft.com/en-us/windows/win32/fileio/deprecation-of-txf)).

Atomicity means recovering a complete old or new state. Durability means an acknowledged save survives the specified failure. They are different promises. Windows normally buffers writes, and exposes `FlushFileBuffers` to flush buffered file information; neither JSON syntax nor successful parsing establishes durability ([file caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching), [FlushFileBuffers](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers)).

The inspected libuv `v1.x` Windows source uses `MoveFileExW(..., MOVEFILE_REPLACE_EXISTING)` for rename, without `MOVEFILE_WRITE_THROUGH`; its file-sync implementation calls `FlushFileBuffers`. Thus flushing a temporary file and renaming it through Node is not, from this evidence alone, a proven durable replacement across power loss. This is a source observation, not a demonstrated failure. Verify the exact libuv bundled with the selected Electron release ([libuv source](https://raw.githubusercontent.com/libuv/libuv/v1.x/src/win/fs.c)). Microsoft documents a separate write-through flag for `MoveFileExW`, but that documentation does not itself prove a complete AutoDispatch commit protocol ([MoveFileExW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)).

| Failure / requirement | JSON feasibility and remaining qualification |
|---|---|
| Normal close and restart | Straightforward: load the validated current snapshot; do not rely on an exit-time save. |
| Backend/application killed during save | Credible with serialized same-directory replacement: old current remains until replacement, and the candidate is complete before publication. Must test every interruption boundary on Windows. |
| Related lifecycle/action/message changes | Put them in one snapshot; no independent writes to `legs.json`, `requests.json` and `messages.json`. One publication includes all consequences. |
| Successful remote action not repeated | Save intent before sending and result afterwards. Committed success is not repeated; uncertain SimBrief outcomes may retry under DEC-059 with accepted remote-duplicate risk. Hoppie uncertainty does not permit blind resubmission. |
| Cleared rotation stays cleared | Publish a new envelope with `rotation: null`; never load older snapshots or orphan documents as active state. Deleting the file alone is insufficient as a recovery policy. |
| OS crash / sudden power loss | Achievable with a suitable storage protocol, but standard Node temp-write/rename is not proven here to preserve the latest acknowledged replacement. This gap matters particularly for possibly-sent markers and clearing. |
| Corruption or external manual rollback | Detect invalid structure/checksum and stop automation; a valid older snapshot cannot be identified as stale from its own checksum. No automatic backup rollback. |

**Durability scope (DEC-054):** M15/AC11 require normal restart and unexpected application/backend-process termination recovery. The first bounded persistence validation targets those failures on the supported Windows/local-filesystem configuration, including acknowledged actions and clears. OS crash, sudden power loss and device-cache failure guarantees remain an explicit PRE-09 decision; they are neither promised nor silently waived. Agree the intended guarantee before commissioning that broader test programme or additional journalling/repair machinery. This does not close PRE-09 or establish JSON write reliability; no ordinary simulator-reconnect confirmation is added.

### Proposed JSON layout and write boundary

Use an application-owned per-user local directory on local NTFS as the initial validation target, not a network or cloud-synchronised folder. A portable/custom data location needs its own storage validation.

| File / location | Role |
|---|---|
| `working-state.json` | One versioned envelope: revision, rotation ID or null, legs, copied planning values, times, phase/facts/holds, handover, relevant OFP data/associations, request outcomes, message bodies/read state and automatic-action markers. |
| `preferences.json` | Settings, local-time display preference, reusable airline/prefix/turnaround profiles; survives rotation replacement/clear. |
| Optional rotation-scoped OFP documents | Large PDFs/original responses only if retaining them is needed. Save immutable content before publishing its reference. Required recovery facts stay in the snapshot. Orphans never create rotations; remove them after clear or on startup cleanup. Start without this extra split unless payload sizes justify it. |
| Bounded diagnostic files | Redacted troubleshooting only, never replayed to rebuild operational state. |
| Windows-supported credential storage | Secrets remain separate from ordinary JSON and logs. |

Separating preferences is safe because applying a profile copies its effective values into the rotation. Editing a reusable profile and applying it to existing legs are separate explicit operations, not an implied transaction across both files. No per-entity files, SQL tables, indexes or append-only event history are needed.

The snapshot envelope contains a schema version, monotonically increasing revision, unique rotation identity and payload checksum. Validate both schema and domain invariants; a checksum detects accidental damage, not old valid data, authorization or malicious edits. Represent unknown values explicitly as null and timestamps as full UTC values. Operational state is application-managed, not a live hand-editable configuration surface.

Proposed save protocol:

1. The sole backend writer builds and validates a complete next snapshot from the committed model. Serialize writes across the entire operation.
2. Create a unique temporary file in the destination directory, write all bytes, verify completion and flush it. Never truncate or incrementally patch the current file.
3. Replace the current file using the selected and validated Windows mechanism. Resolve write/flush/replace errors before any success acknowledgement. Never fall back to delete-current-then-copy or an in-place overwrite after a replacement failure.
4. Only after the required commit guarantee is met, publish durable success or send an external effect that depends on it. Recheck identity/eligibility before sending. File read-back checks content, not survival of power loss.
5. On startup, use the validated current envelope. Do not promote abandoned temporary files by modification time or choose any old file that parses. If current is missing/invalid alongside evidence of an existing store or interrupted save, enter storage recovery rather than silently initializing a new rotation. A genuinely new installation initializes an empty envelope before operation.

This is a design protocol with the Windows replacement/durability implementation still to validate, not a claim that `fs.rename` supplies every step. Do not build a general transaction engine to rescue it. If meeting the required guarantee needs multiple generations, journals and commit-manifest repair, compare that cost against SQLite before proceeding.

No rolling operational backup is proposed initially. It is not needed for ordinary process-crash atomic replacement and cannot safely be auto-restored after a successful remote action or clear. If current is corrupt, retain evidence for diagnosis and disable automation; a later user-mediated salvage design must expose the loss of action/history certainty. Checksums and a `.bak` file alone cannot fix that uncertainty.

Persist accepted planning edits, observed operational facts/phase changes, holds, handover, action intent/outcomes, messages/read state and clear/replacement. Do not write every telemetry sample or wait for application shutdown. Batch changes from one observation, and measure whole-snapshot serialization, flush latency and size during long rotations. Keep logs bounded. No performance budget or maximum rotation size is newly accepted here.

### Libraries and the threshold for SQL

`write-file-atomic` is a candidate building block, not a selected dependency. Its inspected source writes a temporary file, fsyncs by default, closes and renames, with an in-process per-path queue. It does not implement domain validation, cross-process ownership, recovery policy, remote deduplication or a separate post-rename durability step ([maintainer source](https://raw.githubusercontent.com/npm/write-file-atomic/main/lib/index.js)). `electron-store` may be convenient for preferences; its optional `clearInvalidConfig` overwrites invalid data and must not be enabled for operational state ([maintainer documentation](https://github.com/sindresorhus/electron-store#clearinvalidconfig)). Neither library's convenience API replaces the commit/recovery contract. Branch sources were inspected on 15 November 2026; pin and review actual versions before adoption. No dependencies were installed.

There is currently no demonstrated need for SQL queries, concurrent writers or relational storage. Reconsider SQLite only if Windows durability cannot be delivered with a small maintainable file writer, snapshot costs breach measured budgets, or future requirements introduce genuinely independent transactional records/query workloads. Do not split a small “SQL safety ledger” from JSON operational state: that recreates the cross-store consistency problem.

If SQLite becomes justified, preferences and document files can remain ordinary files, while all transactionally coupled operational state moves together. Its documented transaction and crash-testing mechanisms would be the reason, not a local-first distinction ([SQLite transaction guarantees](https://www.sqlite.org/transactional.html)). A proportionate starting configuration remains one backend connection, rollback journal with `synchronous=EXTRA`, subject to packaged-runtime and resource validation; OS/storage assumptions still apply ([atomic commit](https://www.sqlite.org/atomiccommit.html), [synchronous settings](https://www.sqlite.org/pragma.html#pragma_synchronous)).

## Recovery and retention

Load and validate the committed working state before operation. Restore diversion intent, holds, lifecycle, actuals and current workflow outcomes, then resume monitoring from fresh valid telemetry. Preserve phase skipping and unknown actuals. Do not infer live telemetry from stored values or attach an untracked airborne flight.

Normal handover uses completion plus ten simulator minutes, or earlier qualifying departure; clock jumps never reactivate a consumed handover. Non-normal holds prevent progression regardless of elapsed time. Recovery acceptance is the explicit immediate-activation exception. Network timing is independent of simulator acceleration/pause; monotonic process counters are not persisted as operational timestamps.

Save failure reports an error and retains the last committed operational state. Do not publish a successful change, release a hold, send dependent requests or continue in an unsaved operational mode. Resolve an uncertain local commit by verifying the store before resuming mutations. UI drafts can remain for retry; they are not saved rotation data.

If working state is unreadable or its schema unsupported, preserve the file and show a recovery error with an option to create a fresh rotation. Do not silently initialize empty state, automatically repair it, promote an abandoned temporary file or restore an old backup. Fresh rotation creation must save successfully before operation. Preserved unreadable data is recovery material, never automatically reactivated. Settings and credentials use separate storage and are unaffected.

Clear normally completed final rotations by committing an envelope with rotation null. Abnormal final arrivals remain held until recovery or explicit Finish and clear. Replacements get fresh identities. Old callbacks/documents cannot repopulate cleared state. No archive or forensic secure erasure is promised.

Settings/profiles stay separate; applying profile values to legs copies them explicitly. Main owns safeStorage credential operations under DEC-050. Credential IPC/lifecycle and encryption failure details remain PRE-09 work; no secret enters snapshots, logs or diagnostic exports.

## Bounded verification and remaining decisions

These are required future scenarios, not executed tests:

| Scenario | Evidence required | References |
|---|---|---|
| Edit future leg during generation | Old result rejected; input/schedule/messages preserved; explicit regeneration uses new revision | AC02/05, DEC-057/058 |
| Taxi out, return before flight, shut down | Reopen editing without rewriting off-block; airborne history instead stays locked | AC02/03, DEC-058 |
| Declare/change/cancel diversion; restart held | Restore intent; resume paused work only on explicit cancellation; no repeated successful steps | AC11/15, DEC-056 |
| Accept C → B at 14:25 after 14:00 shutdown | Atomic insertion/activation/reset; requested off-block 14:25; original history and messages survive | AC11/15, DEC-056/057 |
| No usable OFP, then user Retry | Four attempts per cycle at most; one local result; preserved input, durable cycle budget; first startup remains blocked | AC05/11/12, DEC-059 |
| Hoppie timeout versus accepted/conflict | No blind resend; bounded known-rejection retries with frozen identities; audit survives reset | AC07, DEC-055/059 |
| Repeated/malformed enum command | Runtime rejection or idempotent existing outcome; no duplicate leg/effect; committed snapshots only | AC13, DEC-060 |
| Save failure / unreadable current | Error, no adopted unsaved state/effect; preserve corrupt file and offer fresh rotation | AC11, DEC-060 |
| Process termination at write/action boundaries | Whole old/new state; action outcomes and clear persist; restart never resurrects cleared data | AC11, DEC-054/060 |

Use pure transitions with synthetic telemetry/clocks and fake services for domain behaviour. Separately authorise the minimal Windows JSON proof: interrupt before/during/after temp write, flush, replacement and acknowledgement, including action intent/outcome, recovery acceptance and clear. Test local write errors and initial store creation. No simulator or live vendor operations are needed for that bounded proof. Decide broader OS-crash/power-loss/device-cache guarantees separately under DEC-054 before expanding the programme.

JSON remains preferred, SQLite a fallback if measured reliability/complexity or workload requires it. The preserved research above is not writer evidence. PRE-01 unattended permission remains a viability gate; PRE-02 supplies API mapping/retry limits, PRE-03/04/05 signal/airport evidence, PRE-06 Hoppie compatibility, and PRE-08 measured resource budgets. Concrete IPC schemas, authentication lifecycle, bounded logs/queues, schema migration and licensing/deployment remain PRE-09 work. None of these gates closes through this review. Profile precedence, partial preliminary content on planning failure and other unagreed details remain proposals; do not invent product behaviour from them.
