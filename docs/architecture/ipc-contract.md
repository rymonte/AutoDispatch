# Local IPC and state contract

Design contract for issue #20, 17 November 2026. This specifies local messages and ownership for DEC-050/060/061/062. It is documentation, not an Electron scaffold or evidence that a writer or integration works. See the [data model](../../data-model-proposal.md), [PRD](../../prd.md) and [prototype plan](../testing/strategy.md#early-development-prototype).

## Ownership and transport

React calls named methods with shared request/response types through a minimal preload API. Main validates the originating window/frame and routes operational commands to the utility process. The utility coordinator validates the payload and domain eligibility, serializes the transition and complete save, then replies and publishes a snapshot. Main does not own a second rotation model. Persistence and external requests remain utility-process integrations; domain modules define ports and import no platform APIs.

Expose a named method for each operation in the catalogue below, plus `subscribe(listener)` for display snapshots. Each method accepts its specific request DTO and returns a promise of its specific response DTO. Frontend and backend share platform-independent contract definitions; internal domain objects remain separate. Formal TypeScript enums and request classes are not required.

Each method maps to one fixed, allowlisted internal IPC endpoint. Endpoint selection determines the handler and its request/response validators; never infer an operation by testing which payload shape matches. For example, RemoveLeg and CancelDiversion both accept a leg ID but use different endpoints. This is a controller-style interface over local IPC, with no HTTP server. Do not expose generic IPC channel selection, filesystem paths, arbitrary URLs, JavaScript execution or provider requests to React.

Catalogue names define the shared types: operation `CancelDiversion` has `CancelDiversionRequest` and `CancelDiversionResponse`, exposed as `backend.cancelDiversion(request)`. Lowercase only the first letter for the method name. Endpoint names are `autodispatch/queries/<method>`, `autodispatch/commands/<method>` and `autodispatch/credentials/<method>` for their respective catalogues; SavePreferences uses the commands prefix. These endpoint strings are transport identifiers, not a required command enum or a field in the request DTO. The bridge owns the fixed mapping; it cannot route a supplied name to arbitrary methods.

Runtime validators reject unknown fields and malformed values before mutation. TypeScript annotations alone do not validate IPC input or provide runtime dispatch. Validate responses against the invoked endpoint's response definition and correlation ID; response handling does not guess by shape either. Replies and adapter results are validated as plain data, without depending on class prototypes or `instanceof`.

## Envelopes, replies and duplicate handling

```text
QueryMetadata = { requestId: Id }
CommandMetadata = { commandId: Id, expectedRevision: Revision, rotationId: Id | null }
NameRequest = metadata-for-catalogue & request-fields-for-operation
CommandReply = { commandId: Id, status: committed, revision: Revision,
                 entityIds: Id[] }
             | { commandId: Id, status: rejected, error: Error }
QueryReply = { requestId: Id, status: ok, value: result-for-operation }
           | { requestId: Id, status: rejected, error: Error }
Error = { code: ErrorCode, message: string, fieldErrors: FieldError[] }
FieldError = { field: string, code: string, message: string }
ErrorCode = InvalidPayload | Conflict | NotFound | NotEligible | Held
          | StorageUnavailable | StateUnreadable | UnsupportedSchema
          | BackendUnavailable | AuthenticationRequired | UnsupportedCapability
CommandReceipt = { commandId: Id, requestDigest: string, revision: Revision,
                   entityIds: Id[] }
```

For each query, NameResponse is QueryReply with the catalogue's specific result type. For each operational command (including SavePreferences), NameResponse uses the common CommandReply shape. Identical response shapes are allowed: the outstanding endpoint invocation and correlation ID determine which response is expected. Valid status/error string values are constrained by the contract without requiring formal enum declarations.

For example, these are shared interface definitions, not runtime implementation:

```ts
type CancelDiversionRequest = CommandMetadata & { legId: Id };
type CancelDiversionResponse = CommandReply;
type RemoveLegRequest = CommandMetadata & { legId: Id };
type RemoveLegResponse = CommandReply;

interface BackendApi {
  cancelDiversion(
    request: CancelDiversionRequest,
  ): Promise<CancelDiversionResponse>;
  removeLeg(request: RemoveLegRequest): Promise<RemoveLegResponse>;
}
```

The two methods route to `autodispatch/commands/cancelDiversion` and `autodispatch/commands/removeLeg` respectively. The selected backend handler receives its validated request as a parameter. A malformed request or unknown endpoint fails with InvalidPayload before any handler runs; if no valid correlation ID can be read, reject the invocation at the transport boundary rather than inventing an ID.

Operational `expectedRevision` refers to WorkingState.revision; preference commands use Preferences.revision. `rotationId` must match for rotation-scoped commands. Create uses null when no rotation exists; replacement names the old rotation. Revision checks are deliberately simple: a changed committed state may require the UI to refresh and ask the user to retry. Telemetry samples are not saves; only meaningful facts advance the committed snapshot. This envelope revision is not a business leg version.

The UI allows one mutation in flight at a time, with the same command ID only for duplicate delivery of identical input. It does not automatically replay a command after a missing reply. Each store retains only its last committed CommandReceipt, written in the same transaction as the change and preserved through subsequent telemetry saves. Check a matching receipt before revision validation: identical canonical request digest returns the existing committed reply without effects; same ID/different input is InvalidPayload. Otherwise require the expected revision and current domain eligibility. Older duplicate commands have stale revisions and are rejected. No unbounded command ledger is needed.

Canonical request digest uses the model's canonical JSON/SHA-256 encoding over `{ endpoint, request }` for the non-secret command. Include the endpoint so identical fields sent to different operations cannot match a receipt. Secret commands never enter this receipt mechanism. All committed commands increment their target store revision, including an already-satisfied SetMessageRead, so an old unrecorded duplicate cannot appear current. No cross-store transaction is promised: applying profile values to legs is separate from saving preferences.

`committed` means the local transition/intent is saved, not that SimBrief or Hoppie succeeded. The backend captures approval time and generated IDs once, commits them, then sends dependent work. Subsequent result states arrive in snapshots. A save failure returns StorageUnavailable, publishes no candidate state and sends no dependent effect. If commit outcome is uncertain, block further mutation and reconcile the current file before reporting a committed state. No unsaved operational mode.

If a reply is lost, the UI queries committed state. A backend failure displays BackendUnavailable; no automatic restart/heartbeat/replay framework is required. Restoring the application loads the saved state and establishes fresh telemetry through the existing recovery rules.

## Query catalogue

| Definition       | Request fields         | Result                                                                                                                                                                                            |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GetSnapshot      | `{}`                   | DisplaySnapshot below.                                                                                                                                                                            |
| GetPreferences   | `{}`                   | Preferences excluding schemaVersion and lastCommand; retain revision for edits, no secrets.                                                                                                       |
| GetMessage       | `{ messageId: Id }`    | Original Message; NotFound after rotation clear.                                                                                                                                                  |
| GetRecoveryDraft | `{ inboundLegId: Id }` | `{ planning: LegPlanningInput, kind: redispatch or reposition }` derived from the confirmed arrival; no save or generation.                                                                       |
| GetPlanDocument  | `{ resultId: Id }`     | `{ mediaType: string, content: string }` for supported bounded text content, or UnsupportedCapability. Binary content returns UnsupportedCapability; this query never opens arbitrary paths/URLs. |

Each query request combines QueryMetadata with its listed fields as one flat DTO. Queries are read-only: no activation, retries, credential refresh side effects or hidden saves. GetRecoveryDraft supplies callsign/default route values without recording an approval time; AcceptRecovery captures that time.

## Operational command catalogue

`LegPlanningInput`, `AircraftConfiguration`, `Id` and other types are defined in the data model. Each request combines CommandMetadata with the fields below as one flat DTO. Full replacement of editable input is explicit; the backend supplies provenance, copied defaults and operational fields; no arbitrary JSON patch or mutation of operational facts is accepted.

| Definition                | Request fields                                                                        | Transition / principal guard                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CreateRotation            | `{ aircraft: AircraftConfiguration, legs: LegPlanningInput[] }`                       | No existing rotation; allocate stable IDs and save unstarted rotation.                                                                                                                                                                                                                         |
| ReplaceRotation           | `{ confirmed: true, aircraft: AircraftConfiguration, legs: LegPlanningInput[] }`      | Confirmation names current rotation/revision; fresh rotation ID, clear old scoped state.                                                                                                                                                                                                       |
| ImportSchedule            | `{ confirmedReplacement: boolean, aircraft: AircraftConfiguration, csvText: string }` | Backend parses CSV under M01, validates all rows/continuity before one create/replace transaction; failure changes nothing.                                                                                                                                                                    |
| AddLeg                    | `{ afterLegId: Id or null, planning: LegPlanningInput }`                              | Null means beginning; respect completed/active order and continuity. Allocate ID, invalidate affected planning context.                                                                                                                                                                        |
| EditLeg                   | `{ legId: Id, planning: LegPlanningInput }`                                           | M01 editing eligibility; preserve actuals/messages; invalidate affected revision/context.                                                                                                                                                                                                      |
| RemoveLeg                 | `{ legId: Id }`                                                                       | Eligible unflown leg only; reconcile live references/holds; preserve original messages.                                                                                                                                                                                                        |
| ReorderLegs               | `{ orderedLegIds: Id[] }`                                                             | Exact permutation of existing legs; no duplicated/missing IDs or movement invalidating flown history.                                                                                                                                                                                          |
| UpdateAircraft            | `{ aircraft: AircraftConfiguration }`                                                 | Copy to eligible legs only; preserve locked-leg values; invalidate affected requests.                                                                                                                                                                                                          |
| StartRotation             | `{}`                                                                                  | Unstarted, eligible aircraft/world; reserve first-leg generation. Remains unstarted until valid OFP.                                                                                                                                                                                           |
| GenerateOfp               | `{ legId: Id }`                                                                       | Started rotation, earliest viable leg, ground/editing eligibility, no duplicate current cycle. Also serves explicit regeneration; never implicitly generates all later pending legs.                                                                                                           |
| RetryGeneration           | `{ legId: Id, previousRequestId: Id }`                                                | Exhausted/stopped current cycle, still eligible; new ID and initial-plus-three budget using latest confirmed inputs.                                                                                                                                                                           |
| DeclareDiversion          | `{ legId: Id, intendedAirportIcao: AirportIcao }`                                     | Current monitored flight before confirmed touchdown; preserve route, set intent/hold.                                                                                                                                                                                                          |
| ChangeDiversion           | `{ legId: Id, intendedAirportIcao: AirportIcao }`                                     | Existing intent before confirmed touchdown; replace intended airport only.                                                                                                                                                                                                                     |
| CancelDiversion           | `{ legId: Id }`                                                                       | Existing intent before confirmed touchdown; release intent only and reevaluate paused work.                                                                                                                                                                                                    |
| ConfirmArrivalAirport     | `{ legId: Id, actualAirportIcao: AirportIcao }`                                       | Unresolved arrival only; classify outcome and reconcile holds/normal final clear. Not arbitrary history editing.                                                                                                                                                                               |
| AcceptRecovery            | `{ inboundLegId: Id, planning: LegPlanningInput }`                                    | Completed abnormal inbound; fresh parked/engines-off telemetry at confirmed actual airport; validate draft route origin/continuity. Insert ordinary leg, activate immediately, capture approval-time requested off-block, reset remaining preparation and resolve applicable hold in one save. |
| SkipRecovery              | `{ inboundLegId: Id, nextLegId: Id }`                                                 | Pending recovery choice; retain manual-reposition hold. No new leg or OFP.                                                                                                                                                                                                                     |
| ResumeNextLeg             | `{ nextLegId: Id }`                                                                   | Explicit manual-reposition confirmation, live normal eligibility; remove only that hold.                                                                                                                                                                                                       |
| FinishRotation            | `{ confirmed: true }`                                                                 | Final abnormal-arrival finish option at valid completion; commit rotation null. Not an arbitrary airborne clear action.                                                                                                                                                                        |
| ReportRto                 | `{ legId: Id }`                                                                       | Active phase TAKEOFF only; return to DEPARTING, preserve off-block and airborne history.                                                                                                                                                                                                       |
| RequestMessageUpdate      | `{ legId: Id }`                                                                       | Explicit update for eligible upcoming flight, no recovery hold; current available planning data only. Creates a new requestedUpdate message, never rewrites/resends an old accepted message.                                                                                                   |
| SetMessageRead            | `{ messageId: Id, read: boolean }`                                                    | Existing rotation message; local read state only.                                                                                                                                                                                                                                              |
| ApplyTurnaroundProfiles   | `{ legIds: Id[], expectedPreferencesRevision: Revision }`                             | Explicitly resolve current rules into eligible legs; backend also checks preference revision before saving the rotation.                                                                                                                                                                       |
| CreateFreshAfterLoadError | `{ confirmed: true, aircraft: AircraftConfiguration, legs: LegPlanningInput[] }`      | Only in StateUnreadable/UnsupportedSchema recovery; preserve original file, commit new envelope before operation. No automatic salvage.                                                                                                                                                        |

CreateFreshAfterLoadError uses expectedRevision 0/rotationId null as a recovery sentinel; it is not accepted in a healthy store. A one-at-a-time backend recovery operation and successful new envelope prevent duplicate creation. Preserved files are recovery material, never loaded automatically. Filename choice is an adapter detail.

Response entityIds list newly created leg/request/message IDs where applicable, otherwise empty. Generated plans remain service results, not a synchronous command return. Background generation uses snapshots/toasts; only first startup uses the blocking overlay. Mutation guards are enforced even if the UI erroneously enables a control.

## Preferences and credential boundary

SavePreferencesRequest combines CommandMetadata with `{ values: PreferencesInput }`; SavePreferencesResponse uses CommandReply. It is exposed as `backend.savePreferences(request)`, where PreferencesInput is exactly the model's preference fields excluding schemaVersion, revision and lastCommand. Validate the complete object and resolve airline/rule references before one preferences-file commit. Rotation values do not silently change; ApplyTurnaroundProfiles is separate. Preferences commands use rotationId null.

Credential request DTOs combine `{ commandId: Id }` with their listed fields, using the separate allowlisted credential endpoints and named methods. Each has a corresponding NameRequest/NameResponse contract. Replies are `{ commandId, status: ok, result: started or signedOut or configured or unconfigured or connected or disconnected }` or `{ commandId, status: rejected, error: Error }`. They do not carry an operational revision or store a secret-bearing receipt. Repeated set/delete requests are idempotent by desired credential value; sign-in allows one current attempt and invalidates superseded callbacks. An error never claims successful deletion/encryption.

Each credential response restricts successful result values to those specified for its operation below; other success values are invalid for that endpoint. The catalogue is:

| Definition           | Request fields    | Result / owner                                                                                                                                                              |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BeginNavigraphSignIn | `{}`              | Utility authentication integration coordinates the verified provider flow; main opens only allowlisted auth URLs. Return started or safe error, never tokens.               |
| SignOutNavigraph     | `{}`              | Stop new authenticated work, clear utility token cache and ask main to delete the stored credential; return signedOut only on success. Existing rotation data is unchanged. |
| SetHoppieKey         | `{ key: string }` | Main encrypts and saves; return configured only after success.                                                                                                              |
| DeleteHoppieKey      | `{}`              | Main deletes saved key and clears utility cache; return unconfigured, including when already absent.                                                                        |
| TestHoppieConnection | `{}`              | Utility uses the verified non-message test when supported; return connection status or UnsupportedCapability, never send test ACARS content implicitly.                     |

A submitted key is transient sensitive input, cleared from the input control after completion; it is never copied into operational snapshots, command receipts or logs. Main exposes no renderer GetSecret operation. Only the trusted utility authentication/Hoppie adapters may request internal `ReadCredential`, `WriteCredential` and `DeleteCredential` operations for the fixed allowed provider values navigraph/hoppie. No arbitrary credential names or paths. Decrypted values live only as needed in adapter memory and are cleared on sign-out/key replacement/process exit. The domain receives connection/authentication status, not tokens.

Check safeStorage encryption availability before saving. If unavailable or storage fails, return an error; never fall back to plaintext or report success. Provider callback handling must validate the actual provider's flow/state; API scopes, redirect method and refresh semantics remain PRE-01/02 evidence dependencies, not invented endpoints. Ignore callbacks from a superseded authentication attempt after sign-out/replacement. Enabling/disabling Hoppie is a non-secret preference; it does not automatically submit historical messages.

## Display snapshots and adapter results

```text
DisplaySnapshot = { revision: Revision, preferencesRevision: Revision,
                    storage: ready | unavailable | recoveryRequired,
                    backend: ready | unavailable,
                    rotation: RotationView | null, integrations: IntegrationStatus[] }
RotationView = { id: Id, started: boolean, aircraft: AircraftConfiguration,
                 legs: LegView[], handover: Handover | null,
                 diversionIntent: DiversionIntent | null, recoveryHolds: RecoveryHold[],
                 messages: MessageSummary[] }
LegView = { id: Id, lifecycle: LegLifecycle, planningRevision: Revision,
            planning: LegPlanning, operations: OperationalFacts,
            currentPlan: PlanResult | null, advancePlan: PlanResult | null,
            generation: GenerationView | null, editable: boolean,
            editBlockReason: string | null, ofpOutOfDate: boolean }
GenerationView = { requestId: Id, kind: PlanningKind, state: PlanningState,
                   attemptCount: integer, finished: boolean, error: SafeError | null }
MessageSummary = { id: Id, aboutLegId: Id, flightContext: { route: Route, identifiers: FlightIdentifiers },
                   createdAtSystemUtc: UtcInstant, read: boolean,
                   submissionState: notSubmitted | possiblySent | accepted | definitiveFailure | uncertain }
IntegrationStatus = { provider: simconnect | navigraph | hoppie,
                      state: connected | connecting | disconnected | signedIn | signedOut
                           | authenticationExpired | unconfigured,
                      observedAtSystemUtc: UtcInstant | null, stale: boolean }
```

Derived view fields are not independently persisted. Backend presence is supplied by main; stale or unavailable telemetry is never presented as live. The UI receives a full snapshot on subscription and after committed changes; it replaces its display model rather than merging writable entities. Transient connection updates may have the same persisted revision and must still update status. Publication is ordered within the active connection; renderer ignores older persisted revisions and clears its subscription on backend unavailability. No automatic replay on renderer reload.

Adapter result envelope: `{ rotationId, legId, requestId, attemptToken, planningRevision, outcome }`. Outcome is a discriminated `usablePlan { plan: normalized result }`, `definitiveFailure { error }`, `unusable { error }` or `uncertain { error }`. Coordinator validates identity/revision/context and current cycle before applying. Hoppie results identify messageId/attemptToken and distinguish accepted, definitiveFailure and uncertain. Simulator observations carry connection identity, sequence, simulator UTC and field-validity metadata; they cannot arrive through renderer commands. Detector-specific signal layout is supplied by the prototype under PRE-03/04.

## Bounds, diagnostics and deferred evidence

Implementation must reject oversized input at the earliest transport boundary and again before domain processing and bound publication/ingress; the initial prototype should start with 1 MiB command envelopes and 5 MiB CSV text via the import command's separate limit. CSV envelope allowance is 5 MiB of UTF-8 CSV plus the normal 1 MiB for envelope/aircraft metadata; validate both. Bound text document replies to 5 MiB as a prototype default, returning UnsupportedCapability for larger/binary content through this query. Return InvalidPayload rather than truncating command input. These are adjustable technical defaults, not measured resource budgets or provider format claims. Snapshot size and telemetry cadence must be measured with representative rotations under PRE-08; no raw telemetry/OFP document stream is embedded in normal snapshots.

Diagnostics record system UTC, command/request IDs, error codes and safe transitions only. Default retention is three rotating files of at most 2 MiB each, separate from rotation ACARS history. No credentials, raw auth responses, message bodies, full service payloads or personal diagnostics. Do not replay logs as state or delete ACARS history to enforce diagnostic limits. These bounded technical defaults may be tuned during the prototype without changing message-retention policy.

Tests for endpoint routing (including identical payload shapes on different endpoints), request/response validation, duplicate delivery, stale results, save failure and restart belong to the early-development prototype under DEC-061. Issue #20 closes on acceptance of this design and the explicit data model; it does not claim executable validation or overall development-baseline approval. Licence/deployment gates remain in the [licensing policy](../development/licensing.md); this contract adopts no runtime dependency or vendor SDK.
