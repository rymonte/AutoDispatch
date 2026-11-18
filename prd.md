# AutoDispatch
**Product Requirements Document — Consolidated Discovery v0.4**

**Product name:** AutoDispatch (provisional)  
**Status:** Discovery / Requirements Definition  
**Target platform:** Windows, Microsoft Flight Simulator 2020 and 2024, subject to integration validation  
**Architecture:** Local-first desktop application  
**Primary integrations:** SimConnect, Navigraph/SimBrief, Hoppie ACARS

**Revision date:** 18 November 2026
**Approval status:** Agreed discovery decisions through DEC-062 incorporated. Electron/TypeScript/React and the high-level process/domain boundaries are accepted; detailed design and technical validation remain outstanding. This is not yet an approved development baseline.

**Previous version:** [v0.3 discovery snapshot](prd-v0.3.md). This revision consolidates the existing requirements and recorded answers without removing outstanding questions or research evidence. Requirement, acceptance-criterion and decision identifiers are retained.

**Issue #20 scope (DEC-061):** close the explicit local data/IPC/storage design; executable persistence and flight-monitoring validation moves to the early-development prototype. This is a sequencing decision, not validation evidence or blanket implementation authorisation.

**Before implementation:** See the [pre-implementation action checklist](#pre-implementation-action-checklist) for outstanding actions, completion evidence and dependencies. Stack selection (DEC-046) and high-level architecture (DEC-050) are accepted; integration, resource and recovery validation remain open.

### Reading this revision

- **Requirements and scope:** Sections 1–5 define the product, MVP requirements and deferred/excluded capabilities. A Must Have describes required product behaviour; it does not assert that an external API or aircraft capability has been proven.
- **Evidence and constraints:** Section 6 retains the integration findings, sources, limitations and candidate approaches. Documented interfaces, third-party demonstrations and live validation are different evidence levels. No live AutoDispatch integration or resource validation is claimed by this revision.
- **Unresolved work:** Section 7 preserves question numbers 1–24, including resolved entries for traceability, and PRE-01–PRE-10 as the actionable pre-implementation reference. Resolved entries are not additional pending decisions. Parked work remains unresolved; future investigations are identified separately from MVP dependencies.
- **Acceptance and decisions:** Section 8 defines acceptance criteria, not completed test results. Section 10 records Accepted, Proposed, Deferred and Superseded decisions. Recommendations are not accepted decisions; unverified assumptions are not established capabilities.

### Consolidated product position

This summary is a reading aid; the detailed requirements and their exceptions below remain authoritative.

| Area | Agreed position / remaining qualification | References |
|---|---|---|
| Product and distribution | Local-first Windows desktop application for individual sim pilots, targeting MSFS 2020/2024 subject to validation. Direct user-authenticated integrations; separate backend and presentation responsibilities. | M04, M14–M17, DEC-001/008/044/045 |
| Working rotation | One locally persisted working rotation. Start Rotation is manual; commencement requires the matching first OFP. Confirm replacement; clear after normal final completion, retaining abnormal-arrival recovery choices. | M01, M15, M16, DEC-027/035/037 |
| Planning and locks | Future legs remain editable during background generation. Current-leg editing requires parked/engines-off telemetry; return to gate before flight can reopen edits. Airborne/completed legs stay locked. Airport edits require explicit regeneration from the earliest viable leg. | M01, M06, M16, DEC-058 |
| Advance preparation | Once the monitored inbound is airborne, distance/groundspeed proximity at or below the configured threshold (default 20 minutes) triggers next-leg preparation independently of displayed phases. Preview is preferred; same-plan regeneration is acceptable if supported. | M06, DEC-002/018/019 |
| Arrival and handover | Generate the next operational OFP on confirmed landing at ≤30 kt, with shutdown fallback if no successful primary OFP exists. Complete inbound when grounded, stationary and all engines stopped after flight. Activate next leg after ten simulator minutes or immediately on earlier qualifying departure, subject to recovery holds. Accepted recovery activates its new leg immediately. | M04–M06, M16, DEC-003/004/049/056 |
| Timing | Store UTC; operational timing follows the simulator. Keep Scheduled, Filed and Actual distinct and departure/arrival comparisons separate. Use filed planning times and gate-based turnaround arithmetic; no live arrival-ETA prediction in MVP. | M05, M11, M12, DEC-010/017/031/032/036 |
| Recovery | Declared diversion intent and detected abnormal arrival converge on a persisted hold. Recovery acceptance creates and immediately activates a fresh leg, files at approval time with no turnaround, and resets remaining preparation while retaining ACARS audit history and schedules. | M15, M16, DEC-056/057 |
| Preliminary messaging and fuel | One automatic message per subsequent leg workflow, with a fresh workflow after accepted recovery; addressed to the inbound callsign, none for the first leg. Retain an in-app log independently of Hoppie. Use OFP/API planning fuel figures; actual uplift/loading and aircraft FMS fuel predictions are outside MVP. | M09, DEC-030/038/039/040/042/043 |
| Technical readiness | Electron + TypeScript + React and the high-level domain/integration/process boundaries are accepted. Unattended SimBrief access remains a viability dependency; airport identification, signal rules, Hoppie compatibility, resource budgets and detailed design remain outstanding. | D01–D04, Section 7, DEC-046/050, PRE-01–PRE-10 |

---

## 1. Product Overview

AutoDispatch is a standalone desktop application providing multi-leg flight scheduling, real-time flight monitoring, turnaround tracking, SimBrief flight planning and preliminary dispatch information delivered to compatible aircraft through Hoppie ACARS.

The application is intended to complement existing flight-simulation career and scheduling software, including A Pilot's Life v2, without depending on it.

The primary use case is a flight simulation enthusiast operating multiple consecutive sectors with the same aircraft who wants to maintain an accurate schedule, monitor delays, prepare subsequent flights and receive relevant operational information within the simulator.

### Core Principles

- The application runs entirely on the user's computer. No proprietary cloud backend is required.
- External API communication originates directly from the user's application using their own authenticated accounts and credentials.
- SimBrief is the authority for planned flight, passenger, fuel and weight information.
- The dispatch manager handles scheduling, dispatch coordination, delay calculation and preliminary ACARS communications.
- Aircraft loading, refuelling and ground handling remain the responsibility of the pilot and tools such as GSX.
- The application does not replace an airline career manager, flight-planning engine or general-purpose ACARS client.
- The product should remain accessible to everyday flight simulation enthusiasts without requiring knowledge of API-specific terminology.
- Automated dispatch is essential to the product proposition. If supported unattended OFP generation is unavailable, reassess product viability rather than substitute a manual browser-generation workflow.
- Operational timing follows simulator time. All stored timestamps use UTC; BST and other local offsets never alter stored operational times.

### Rotation Model

The application manages **one current working rotation at a time**.

A rotation consists of multiple consecutive flight legs associated with a common aircraft configuration.

The single current working rotation persists locally between application sessions, including pending legs, active-leg progress and completed-leg history, until replaced or automatically cleared under M01. Persistence supports automatic recovery and continuation, not a library of saved rotations.

Individual legs are not independently saved as reusable objects, and the MVP does not include a rotation library or simultaneous management of multiple rotations.

---

## 2. Must Have — MVP

### M01 — Multi-Leg Rotation Management

- Provide a **New Rotation** option to create a new working rotation. When a current rotation exists, require confirmation before replacing it.
- Commencing a rotation always requires an explicit user action. Creating a rotation or detecting a ready aircraft must not start it automatically; apply M16's startup eligibility checks.
- **Start Rotation** initiates the first-leg OFP request and the startup workflow. The rotation becomes started, and its first leg Active, only after SimBrief returns the flight plan successfully; sending or acknowledging the request is not commencement.
- Add, edit, reorder and remove flight legs.
- Allow the user to skip an unflown leg explicitly, through a recovery/skip control or removal in the rotation editor. Never skip or remove a leg automatically because its time has passed, telemetry is missing or generation fails. The precise UI mechanism is a design choice; a separate persistent Skipped state is not required by this decision. Retain the existing departure/completion locks and airport-continuity checks. Where proceeding requires manual repositioning, use the existing explicit-resume protection rather than interpreting relocation as departure.
- Support an arbitrary sequence of consecutive flight legs within reasonable application limits.
- Import schedules through CSV.
- Supply a downloadable CSV template with documented fields.
- Support manual leg creation independently of external scheduling applications.
- Validate planned-airport continuity between future legs. At the boundary with completed history, use the actual arrival airport without rewriting the completed planned route. Intentional gaps require the explicit manual-reposition/Resume workflow (DEC-056).
- Detect and report invalid or conflicting scheduled times.
- Accept optional timing inputs for legs beyond the first; a complete timetable is not required to create a rotation. CSV imports follow the same optional-timing rules as manual entry.
- Automatically preserve the current rotation between application sessions.
- Automatically clear the live rotation when its final leg completes normally after flight with the aircraft stationary and all engines stopped. Do not clear at touchdown, the low-speed arrival trigger or OFP generation.
- For a final-leg return to departure or diversion, retain the rotation and show a confirmation prompt at stationary/full shutdown. Offer the applicable re-dispatch/repositioning action or **Finish and clear rotation**. Clear only if the user explicitly chooses to finish; closing or leaving the prompt unanswered preserves the rotation. Adding a recovery leg continues the same rotation.
- Replacement or automatic clearing removes the working rotation's legs, completed operational history, local OFP associations and application-message history. Preserve integration credentials, settings and airline/turnaround profiles. Do not delete plans or other data from SimBrief. MVP has no archive of previous rotations.
- Prevent changes that would invalidate an active or completed flight.

**Lifecycle restrictions:**

- Pending legs may be edited, reordered or removed during subsequent background generation. Invalidate affected request revisions/context atomically rather than applying their late results; reconcile continuity and live targets. First-leg generation alone blocks user interaction through the startup overlay (DEC-058, superseding DEC-052 ordering locks).
- Removing an eligible unflown leg preserves its original ACARS messages, frozen flight context and submission outcomes for the rotation lifetime. No hidden leg or full historical planning/request graph is required. Reconcile live handover and recovery targets without releasing holds, and invalidate outstanding work so late responses cannot recreate or dispatch the removed leg (DEC-051 as simplified by DEC-057).
- Current-leg planning is editable only with fresh confirmed grounded, stationary, all-propulsion-engines-off telemetry. APU/external power is allowed. Engine start or taxi-out closes editing; activation alone does not. Future pending legs remain editable during flight and background generation.
- Before any established airborne flight, returning to gate and meeting the parked/engines-off conditions reopens editing, including after an RTO. Preserve original off-block and other actuals. Planning changes invalidate the OFP and require explicit regeneration. Once airborne is established, the planning lock is permanent through arrival; a return after flight uses a new recovery leg (DEC-058).
- Completed legs are locked and preserve their operational history for the lifetime of the current working rotation, until replacement or automatic clearing.
- Manual entry or editing of actual operational-event timestamps is outside MVP scope. Planning-field editing does not allow changes to recorded actuals.

There is no requirement to name rotations, maintain a library of saved rotations or individually save flight legs.

### M02 — Flight and Airframe Configuration

Each leg supports:

- Origin and destination ICAO airport.
- Mandatory ATC callsign.
- Optional IATA flight number.
- Off-block and on-block timing fields, with three distinct concepts: Scheduled, Filed and Actual.
- Optional user-entered timing targets for legs beyond the first. A manually entered scheduled target can serve as a delay baseline; OFP-filed planning times and recorded actuals must remain distinguishable from it.
- The first available OFP-filed time establishes the corresponding Scheduled baseline when no manual schedule exists. Later OFP revisions update Filed, not Scheduled.
- Flight date.
- Turnaround configuration or override.
- Applicable SimBrief planning options.

The rotation has a common aircraft configuration containing:

- SimBrief-compatible aircraft type.
- Aircraft subtype and variant, where applicable.
- Optional SimBrief saved-airframe reference as an alternative to manually configured aircraft details.
- Optional aircraft registration.
- Optional maximum passenger capacity.

For MVP, support manual aircraft setup when planning the rotation. Users may optionally supply a SimBrief airframe Internal ID instead of manually configuring the airframe. Do not require airframe IDs, bulk ID entry or an imported collection of profiles to use the application.

Use SimBrief's general catalogue to offer aircraft type and variant selection, including add-on-specific, engine and configuration variants where the catalogue provides them. Manual setup does not mean requiring users to type catalogue identifiers or recreate an available variant's configuration. This catalogue-based selection is independent of access to personal saved airframes.

The preferred workflow is to retrieve the authenticated user's saved SimBrief airframes and let them select one, if a supported API endpoint and permissions allow it. This is a preferred integration capability, not verified availability or a requirement to build a local fleet-management system. Do not confuse SimBrief's general aircraft catalogue with a user's personal saved airframes. The previously suggested last-used configuration default has not been agreed.

**Flight identification:**

The IATA flight number and ATC callsign are maintained as separate data fields.

When both are present, display them as `U27421/EZY7421`.

When the IATA number is absent, display only `EZY7421`.

Maximum passenger capacity acts as a hard ceiling on planned passengers. Actual planned passengers remain determined by SimBrief.

Later-leg readiness estimates may come from inbound readiness; Scheduled baselines come only from manual input or the first available OFP-filed time under M05. Do not invent scheduled times to populate the rotation. First-leg activation is defined in M16. Planning editability follows M01's parked/engines-off and pre-flight return-to-gate rule; API response-to-leg association remains to be verified.

### M03 — Callsign-Based Operational Rules and Airline Profiles

- Support reusable operational profiles containing default turnaround rules.
- Match turnaround rules against ATC callsign prefixes.
- Permit multiple callsign prefixes to share the same rule set.
- Provide a default turnaround time when no specific prefix matches.
- Permit per-leg turnaround overrides.
- Maintain optional airline identity profiles for organisational purposes.

An airline profile may contain:

- Airline name.
- ICAO airline code.
- IATA airline code.
- One or more associated callsign prefixes.
- Default turnaround time.

For example, `EZY` and `EJU` may share a 35-minute turnaround rule.

**Airline grouping must not be mandatory for callsign-based rule matching.**

Profiles do not manage aircraft registrations, aircraft performance, standby fleets or fleet availability.

### M04 — Flight Monitoring

Connect to MSFS 2020 and MSFS 2024 through SimConnect and monitor:

- Aircraft identity, where available.
- Current flight position and progress.
- On-ground versus airborne state.
- Flight phase transitions.
- Actual off-block, takeoff, landing and on-block times.
- Current fuel quantities where available for flight monitoring. MVP preliminary fuel information uses planning figures from the OFP or supported Navigraph/SimBrief API data under M09, not live fuel-based arrival predictions or uplift calculations.

Recognised flight phases and agreed behaviour:

| Phase | Behaviour |
|---|---|
| DEPARTING | Covers leaving the stand, pushback and taxi. There is no separate TAXI-OUT phase. Movement direction is irrelevant; engine-off pushback should be recognised. Exact detection signals remain provisional. |
| TAKEOFF | Begins on the ground roll with high power and ground speed at least 30 kt, in departure context. The high-power definition requires aircraft validation. |
| CLIMB | Aircraft airborne above 1,500 ft AGL after departure. Observing TAKEOFF first is not mandatory. |
| CRUISE | Sustained level flight at or above the current OFP cruise altitude minus 2,000 ft, with no upper altitude limit. Confirmation duration remains to be validated. |
| DESCENT | Working proposal: more than 3,000 ft altitude loss from the aircraft's actual operating level, within 150 NM straight-line distance of destination. Reference-altitude tracking and alternative classification remain unresolved. |
| FINAL APPROACH | Aircraft airborne at or below 3,000 ft AGL, below 220 KIAS, with flaps deployed and landing gear extended. Arrival context must prevent misclassification immediately after departure; exact guards remain to be defined. |
| LANDED | Confirmed return to ground after a previously established airborne state, with bounce/go-around protection. No mandatory observed CRUISE → DESCENT → FINAL APPROACH sequence. A return to the departure airport is a valid landing; classify the arrival outcome separately under M16. |
| PARKED | Aircraft confirmed on ground, stationary with all engines stopped; no stand-location or scenery/AFCAD detection is required. Leg completion additionally requires the established after-flight context under M16; an initial parked state does not complete a fresh leg. |

Phase detection must tolerate missed transitions and recognise a sufficiently established later phase. Confirmation checks must prevent transient telemetry from causing false transitions or repeated dispatch actions.

Provide a manual RTO action on the main screen, visible only during TAKEOFF, which returns the phase to DEPARTING while preserving the active leg and original off-block time. Automatic rejected-takeoff detection is not required for MVP.

Takeoff-roll detection and the actual liftoff timestamp are distinct. Likewise, landing recognition, the low-speed dispatch trigger and parked/leg-completion detection are distinct events.

**Departure detection under investigation:** Ground movement around 3 kt, beacon state, parking-brake state and engine state have been discussed. No final combined rule has been accepted. The rule must accommodate self-manoeuvring stands and pushback with delayed engine start. Exclude door checks and pushback-specific signals from the departure-detection design; recognise departure movement without identifying the pushback provider or a separate pushback phase (DEC-041).

Flight lifecycle and operational flight phase must be maintained separately.

MVP does not offer manual entry or correction of off-block, takeoff, landing or on-block timestamps. Preserve observed simulator-time actuals; missed timestamps remain unknown rather than being filled in by the user or invented. This does not remove the explicitly agreed RTO, airport-confirmation or rotation-recovery actions, which do not provide arbitrary timestamp editing.

**Minimum aircraft compatibility targets:**

- Fenix A320 family and variants.
- TFDI MD-11.
- PMDG 737.
- PMDG 777.
- Bluebird 757.
- iFly 737 MAX-8.
- iniBuilds A340.
- iniBuilds A380.
- iniBuilds A350.
- FlyByWire A320neo.
- FlyByWire A380X.
- FlightSimStudio E-Jets.
- Aerosoft A340-600.

These are target families, not verified availability or compatibility claims for every simulator/variant. Prefer standard SimConnect signals; use aircraft-specific integrations where needed. Track compatibility by aircraft variant/version and simulator. Unknown or stale engine data must not be interpreted as confirmed shutdown.

Cold-and-dark is not a prerequisite for first-leg activation. Powered turnaround configurations, including an operating APU or external power, are valid when the M16 ground/brake/engine conditions are met.

**Future compatibility consideration:** The product owner identified Asobo ATR hotel mode (engine 2 running with its propeller braked) as an example where engines-off is not equivalent to a parked ground-service state. ATR support is outside the initial aircraft scope. Any future hotel-mode exception must be aircraft-specific and verified; do not weaken the MVP engines-off checks or treat a stopped propeller alone as proof of shutdown. Revisit initial activation, arrival completion and shutdown-fallback dispatch together if such support is introduced.

### M05 — Next-Leg Readiness and Available Delay Calculations

Maintain distinct scheduled baselines, OFP-filed planning times and actual timestamps. For MVP departure/arrival display, an "estimate" means the time filed in the OFP, not a continuously recalculated prediction. Capture actual off-block/on-block event times from simulator UTC. MVP does not calculate real-time landing or arrival ETAs from position, speed, flight progress, weather or other telemetry; this is deferred under S08.

For each off-block and on-block event:

- **Scheduled:** the user-entered schedule, or the first available OFP-filed time if no manual schedule exists. Retain this baseline across OFP regeneration. An explicit eligible schedule edit under M01 may change it, subject to M01 planning eligibility and the first-generation overlay.
- **Filed:** the corresponding time from the latest OFP. Successful regeneration updates this value without silently changing Scheduled.
- **Actual:** the observed event timestamp in simulator UTC. It is not user-editable in MVP and remains unknown until observed.

Persist all three values separately for the working rotation. Scheduled and Filed may initially be equal, but they are not interchangeable.

Turnaround starts at gate/on-block arrival. The earliest estimated off-block time for Leg B is:

`Leg A gate arrival (estimated until observed) + Leg B turnaround`

Before landing, use the OFP-filed on-block time as the planning reference when available; if the OFP instead supplies a planned landing time, add its planned taxi-in allowance. Do not generate a live airborne ETA. After landing, the agreed dispatch-readiness calculation uses `actual landing time + planned taxi-in`, then adds outbound turnaround. This simple readiness allowance does not replace the filed arrival time in the flight's planned-versus-actual display. Once gate arrival is detected, use the recorded gate-arrival proxy for readiness instead of the allowance.

For MVP, stationary with all engines stopped after flight is the agreed gate-arrival proxy. It is not proof of a particular stand or an exact reproduction of airline on-block reporting; its recorded timestamp is not user-editable. Arrival delay compares scheduled gate/on-block arrival against recorded gate/on-block arrival, separately from touchdown.

Requirements:

- Obtain the preceding leg's planned taxi-in time from its current SimBrief OFP, where available.
- Provide a configurable fallback taxi-in duration.
- Update next-leg readiness when the inbound OFP-filed timing changes or actual landing/on-block observations become available, using the calculation rules above. Do not continuously predict airborne arrival time.
- Use actual landing and on-block information when available.
- Compare estimated and actual timings against scheduled timings.
- Infer a future leg's departure delay where its scheduled departure has been entered manually and sufficient inbound-readiness information exists. Do not assume a complete timetable for later legs.
- Account for available turnaround buffers and opportunities to recover time.
- Calculate departure and arrival deviations independently.
- Preserve UTC as the authoritative scheduling reference.
- Do not manufacture delay values where no valid scheduled baseline exists.

**Scheduling scope and baselines:**

- A complete rotation timetable is not required for MVP.
- Use a manually entered scheduled target where supplied; otherwise initialise the baseline from the first available OFP-filed time. Later OFPs update Filed without resetting Scheduled.
- Where a scheduled departure exists, estimated departure is the later of that scheduled departure and calculated aircraft-ready time. Actual early departures must still be recognised and recorded.
- Preserve each leg's scheduled arrival baseline separately from actual events and turnaround-readiness calculations. Compare scheduled on-block with actual on-block for that leg's arrival delay.
- An individual leg can report its own arrival delay independently of whether future legs have schedules.
- Evaluate departure and arrival timing independently. Persistently display Scheduled versus Actual, and show Scheduled versus Filed on hover over the corresponding time. A missing Actual remains explicitly unknown, without substituting Filed into the Actual display. Scheduled-versus-Filed is a planning comparison, not a live ETA prediction. Missing comparison inputs mean unknown timing deviation, not on-time status.
- OFP times generated after an operational delay do not retrospectively establish an earlier delay baseline. Do not reset a retained baseline merely because a turnaround-readiness calculation changes.
- If no scheduled baseline exists, show known estimates without early/late classification. If no estimate exists either, show timing as not yet estimated.
- Automatically constructing a full timetable and propagating delays through it are post-MVP improvements under S06 and S07.

**Arrival-trigger timing:**

- At the primary next-OFP trigger, use estimated gate arrival including taxi-in from the inbound leg's current OFP, or the configured fallback duration, then add the outbound turnaround. Do not start turnaround at touchdown or the ≤30 kt trigger.
- At stationary/all-engines-stopped detection, replace the gate-arrival estimate with the recorded gate-arrival proxy and add turnaround only; do not add taxi-in again.
- The ≤30 kt event triggers planning; it does not reset the landing timestamp or start a fresh full taxi-in allowance. Updating readiness at gate arrival does not itself regenerate an already successful primary OFP (M06).
- Timing gaps do not require a separate predictive recovery engine. Once the previously flown inbound leg meets the valid on-ground, stationary, all-engines-stopped completion conditions, record the gate-arrival proxy and use the existing next-leg workflow even if touchdown was missed or the taxi-in estimate was exceeded. Leave unobserved touchdown time unknown. Apply the existing turnaround calculation, ten-minute activation interval/early-departure exception, final-leg clearing and airport/recovery holds; shutdown alone must not bypass them or complete an initial parked leg.

**Clock rules:**

- Scheduling, turnaround and the ten-minute activation interval follow simulator time. The advance-dispatch threshold is a comparison against distance/current groundspeed under M06, not an elapsed-time countdown.
- All timestamps are stored as UTC. Diagnostic and external-service timestamps use system UTC where appropriate; network timeouts, polling and authentication expiry are independent of simulator acceleration or pauses.
- No special clock-change reconciliation, confirmation prompt or scheduling pause is required when the user manually changes simulator date/time. Ordinary persistence under M15 remains required.

**Example:**

| Event | Time |
|---|---|
| Previous leg observed landing | 14:55Z |
| Taxi-in | 8 minutes |
| Ground turnaround | 35 minutes |
| Earliest next off-block | 15:38Z |
| Scheduled next off-block | 15:20Z |
| Estimated departure delay | +18 minutes |

Update the readiness-based departure delay when relevant planning inputs or observed events change. This example does not require a real-time airborne ETA prediction.

### M06 — SimBrief Preview and Automated Dispatch Integration

- Authenticate the user through their own Navigraph/SimBrief account.
- Retrieve and parse existing SimBrief OFPs.
- Associate each generated OFP with its respective flight leg.
- Obtain preliminary planning information for the next eligible leg before inbound arrival, preferably through a preview calculation that does not create a duplicate saved OFP.
- Trigger advance planning using the distance/groundspeed proximity calculation below, with a configurable threshold defaulting to 20 minutes. This is not a predicted landing or gate-arrival time.
- Generate the operational OFP at the primary arrival trigger, with the shutdown fallback described below.
- For a not-yet-started rotation, Start Rotation requests the first leg's OFP; successful receipt of that OFP is required before commencement and first-leg activation. Do not trigger first-leg generation solely from aircraft readiness. Subsequent-leg manual generation and pre-departure regeneration remain subject to the usual eligibility rules.
- Support editing/regenerating the same plan where the API permits it; this is an acceptable alternative to preview calculations if it avoids duplicate saved plans.
- Prevent unintended local duplicate generation and adoption. DEC-059 explicitly accepts possible duplicate remote plans when retrying a request that returned no usable OFP.
- Persist dispatch identifiers, status and relevant returned flight-plan data.
- Do not treat manual browser-assisted generation as a replacement for the essential unattended workflow. A browser used for user authentication is a separate concern.

**Advance calculation and final OFP:**

- Advance information supplies next-leg planned block fuel and other preliminary planning figures. Inbound estimated arrival fuel uses the current leg's planning data from the OFP or supported Navigraph/SimBrief API under M09; actual uplift is a loading concern outside the application's scope. The final OFP should use current planning inputs when generated on arrival.
- Preview calculation is preferred over generating two duplicate saved flight plans for one leg.
- SimBrief remains authoritative for planning calculations and returned OFP data. Do not invent an undocumented preview, edit or generation API.
- Behaviour when only duplicate-producing generation is available remains an explicit product/API question.

**Pre-dispatch proximity trigger — accepted rule:**

`Proximity minutes = (great-circle distance to inbound destination in NM / current groundspeed in knots) × 60`

- Use the monitored inbound aircraft's current position and groundspeed, and the destination airport of that inbound leg. Distance is straight-line/great-circle distance, not remaining flight-plan route distance or distance to the next waypoint.
- The user-configurable threshold defaults to **20 minutes**. The proximity condition is **calculated proximity minutes ≤ configured threshold**: 20 minutes or less with the default setting, subject to eligibility and valid-flight-state checks. An exact match or a crossing from above the threshold is not required.
- This calculation is used **only to trigger advance preview/pre-dispatch preparation for the next eligible leg**. It is not a hard ETA, an expected touchdown time, a gate-arrival prediction or a promise that the aircraft will arrive within the threshold.
- Do not use this value as the landing/gate ETA in schedule displays, delay calculations, gate-arrival estimates or turnaround calculations. Displayed planning times come from the OFP; the app does not provide real-time arrival-ETA prediction. M05's simple arrival/turnaround-readiness calculations remain separate.
- The trigger does not require an aircraft FMS ETA, `GPS ETA`, `GPS ETE`, a VATSIM connection or any UKCP service. It runs locally from simulator telemetry and destination coordinates.
- Evaluate it for the monitored inbound flight once airborne is confirmed, with valid, current telemetry and a known destination position. Pre-dispatch operates independently of the displayed flight phase and observed phase sequence: it does not require CLIMB, CRUISE, a minimum altitude or any preceding phase to have been detected. Trigger advance preparation as soon as the proximity condition and next-leg eligibility are satisfied. Zero, negative, unavailable or stale groundspeed must not produce a trigger; exclude invalid position/distance data as well.
- Once successful advance preparation has occurred for the eligible next-leg workflow, subsequent threshold crossings must not repeat it automatically. Accepted recovery can reset that workflow under DEC-057; failure/uncertainty follows DEC-059.
- This trigger also initiates the single automatic preliminary-message workflow for that next leg under M09. The first leg of the rotation receives no preliminary dispatch message.
- A short sector already within the threshold when airborne is confirmed qualifies immediately; no prior observation outside the threshold or subsequent crossing is required. Holdings, vectors, speed changes, remaining approach routing and taxi-in are not predicted by this approximation.
- The actual final-OFP generation triggers remain confirmed arrival on ground at ≤30 kt, with the stationary/all-engines-stopped fallback. This pre-dispatch trigger does not replace them.

**Automatic final-OFP triggers:**

| Trigger | Conditions | Timing inputs |
|---|---|---|
| Primary | Confirmed landing, on ground, ground speed ≤30 kt | Inbound OFP taxi-in allowance plus outbound turnaround |
| Fallback | Aircraft stationary and all engines stopped | Turnaround only; assumed parked |

- Automatic arrival dispatch is configurable and can be disabled. Keep a manual generation/override action.
- The shutdown fallback may evaluate generation if the primary trigger did not produce an OFP; it must not replace a successful primary OFP. A pending retry cycle retains its budget; shutdown does not start a fresh automatic cycle after exhaustion, which requires user Retry (DEC-059).
- Apply DEC-059: no usable OFP, including a timeout or corrupt response, permits bounded retries with accepted remote-duplicate risk. Adopt only one valid matching result locally.
- Bounce/go-around handling must prevent false or repeated arrival-trigger generation.
- A confirmed return to departure or diversion suspends automatic onward OFP generation, including both primary and shutdown-fallback triggers, until the user confirms or adjusts the remaining rotation under M16. Reaching the normal trigger conditions must not bypass that suspension.
- Generating the outbound OFP does not complete the inbound leg. That leg remains active until stationary with all engines stopped.

**Dispatch sequencing:**

- Among pending flights, only the first pending flight is eligible for manual generation. For the initial leg of an unstarted rotation, the user initiates this through Start Rotation; subsequent eligible legs retain Generate OFP Now.
- Operational OFP dispatch/generation requires confirmed on-ground aircraft state; block it while airborne. Users may still create or edit an eligible future rotation/schedule in the air. Advance preview/pre-dispatch preparation for the next leg of an already monitored rotation remains governed by the separate airborne proximity trigger; it does not attach to an untracked flight or bypass the ground requirement for final operational dispatch.
- Later pending flights must wait until they become the next eligible flight.
- The initial leg cannot become Active before its first OFP is returned. Once Active, it may be edited and regenerated while still pre-departure under the existing locks. Subsequent-leg handover retains its agreed rules; an eligible subsequent Active leg without an OFP may request one while still pre-departure.
- The current leg cannot initiate ordinary generation for itself while taxiing, with engines running or after established airborne flight. A grounded pre-flight return to gate may reopen editing/regeneration under M01. Completed legs remain excluded; arrival dispatch for the next eligible leg remains separate.
- Automatic generation must respect the same sequencing rules.
- User-confirmed re-dispatch after a return to departure creates a new leg under M16 and requires a newly generated OFP. It does not reopen the completed leg or reuse its OFP as the new flight's current plan. Refresh planning inputs for the new departure, including weather and runway selection where supported by the verified SimBrief workflow; do not assume access to authoritative active-runway information.

Planning edits and explicit regeneration follow M01 parked/engines-off eligibility, including a pre-flight return to gate. Future legs remain editable during background generation; an edit invalidates the affected request revision rather than locking the app.

**Edits and generation (DEC-058/059):**

- First-leg generation uses an app-wide loading overlay until a usable matching OFP succeeds or the retry cycle exhausts. The backend remains responsive; this is a blocking user flow, not synchronous blocking I/O. No OFP means no initial commencement and no Start without flight plan option.
- Subsequent generation is asynchronous with a toast/loading indicator. It does not impose a planning-input lock on otherwise eligible legs. Preserve monitoring and access to Divert.
- Planning edits make affected plans Out of date and invalidate obsolete request revisions/context. Airport changes outside diversion require explicit regeneration from the earliest viable leg: the current leg if eligible under M01, otherwise the next eligible leg. Reassess dependent downstream preparation without losing schedules or ACARS history. Edits alone do not issue replacement requests.
- Regenerate OFP remains an explicit action subject to ground state, sequencing and M01 editability. A pre-flight return to gate can make it available again; airborne/completed planning stays locked.
- A valid matching OFP from a request already sent may arrive after departure: associate it without resetting events or unlocking planning. Disregard obsolete results at the response boundary; do not assume external cancellation.
- Each generation cycle has one initial attempt plus up to three automatic retries when no usable matching flight plan is received, including definitive failure, timeout/lost response and corrupt/unusable output. Preserve all entered data. Duplicate remote SimBrief plans under this degradation are an accepted trade-off; this does not approve an inherently duplicate-producing normal preview workflow.
- On first valid matching success, adopt one result, stop unsent retries and disregard additional results. Persist the current cycle/outcome so restart does not reset its attempt budget or repeat known success. A timeout remains evidence of uncertainty, not proof of remote failure, even though retry is permitted.
- After exhaustion, show the problem and offer Retry. Manual Retry starts a fresh initial-plus-three cycle using the latest confirmed inputs. Timing/backoff, usable-response validation and API limits remain PRE-02 work; no automatic overlapping cycle or unlimited shutdown-triggered retry loop is intended.
- For an already-started rotation, including an accepted recovery leg, exhausted planning leaves monitoring available and the pilot may proceed with degraded planning information. Do not fabricate fuel or other unavailable figures. Stop initiating new attempts once the leg is airborne; a matching already-sent result may still attach. First-leg startup remains OFP-gated.
- Hoppie does not inherit this retry policy; M09 retains conservative handling of uncertain submissions.

**Dependency:** Unattended dispatch requires confirmation of the necessary Navigraph/SimBrief API capabilities and approval.

The application must not assume that unconfirmed API capabilities are available.

If supported unattended generation is unavailable, reassess the project proposition. Authentication, API V2 access, preview/save semantics and edit/regeneration support remain pending Navigraph clarification.

### M07 — Per-Leg Fuel Planning Options

Provide optional SimBrief dispatch inputs for:

- ATC fuel.
- Weather fuel.
- MEL fuel.
- Additional/extra fuel.
- Contingency fuel.
- Final reserve fuel.

Support applicable SimBrief units, including minutes or weight where permitted.

These values are passed to SimBrief rather than independently used to construct a replacement flight plan.

Additional advanced planning parameters may be exposed only where supported by the integration.

### M08 — Passenger and Weight Validation

- Pass the configured maximum passenger capacity to SimBrief where supported.
- Validate returned planned passenger counts against configured capacity.
- Do not silently alter passenger figures after OFP generation.
- Notify the user when returned passenger figures violate configured constraints.
- Treat SimBrief as the authority for final planned passenger and weight information.
- Do not present provisional passenger or fuel estimates as confirmed SimBrief values.

**Weight units:**

- SimBrief airframe configuration determines the applicable weight units for generated planning information.
- The application may provide a default KG/LBS preference when preparing a dispatch.
- Users may adjust the preference at dispatch time when applicable.
- Generated OFP values and units returned by SimBrief take precedence.
- The application must not silently override SimBrief weight values or their units through a global display preference.

### M09 — Preliminary Dispatch and ACARS

Maintain an internal application-specific ACARS message centre.

The message centre must operate even when Hoppie is not configured or connected.

Requirements:

- Generate one automatic preliminary dispatch message per eligible subsequent leg workflow, triggered during its monitored inbound leg when proximity minutes are at or below the user's configured threshold (default 20 minutes), as defined in M06. This is the configured advance/ETA-delta setting, not a separate timer or a hard arrival ETA.
- Do not generate a preliminary dispatch message for the first leg of the rotation. For A → B → C, the first message concerns B → C and is triggered during A → B.
- Produce the message as the outcome of the triggered advance-preparation workflow using the available information under this requirement. Do not generate automatic revised messages as estimates change, the threshold is crossed again, the final OFP is generated or the app reconnects/restarts. Persist the workflow message marker to preserve this behaviour. Accepted recovery explicitly resets remaining preparation under DEC-057 and may produce a fresh automatic message; retain all earlier messages as audit history.
- Updates beyond that single automatic message require an explicit user request, except a fresh workflow after accepted recovery under DEC-057. Retrying a failed submission to Hoppie concerns the same message; once Hoppie confirms acceptance, do not resend it to seek delivery confirmation.
- Associate original messages with stable leg identities and retain frozen flight context. Editing a future leg never loses or rewrites its messages. No historical leg copies or full planning provenance graph are required (DEC-057).
- Store every application-generated message in the in-app ACARS log independently of Hoppie configuration or transmission outcome. Retain that history for the lifetime of the working rotation under M01/M15.
- Track read and unread state.
- Record timestamps.
- Support message delivery through Hoppie when configured.
- Route external messages through the Hoppie network to the aircraft's own compatible client. Users are responsible for configuring Hoppie in their aircraft; no direct aircraft ACARS bridge is required.
- Use **AD<current inbound ATC callsign>** as the preferred Hoppie sender format (for example, ADEZY1871), subject to sender-length, character and supported-aircraft display validation. Preserve an identifiable dispatcher/flight identity; accept residual same-callsign collision risk rather than use an arbitrary installation identifier. AutoDispatch remains the provisional application name. Do not silently truncate unsupported sender values; resolve any required format adjustment under D03/open question 23 (DEC-055).
- Address the preliminary dispatch message to the **current active inbound leg's ATC callsign**, matching the aircraft's current Hoppie callsign. Identify the upcoming flight in the message body and associate the message with that upcoming leg; do not use the upcoming leg's callsign as the recipient merely because the message concerns it. For inbound EZY123 and next leg EZY456, send to EZY123 with EZY456 identified in the body. The user is responsible for matching the aircraft's Hoppie callsign to the current leg.
- When Hoppie is configured, submit the generated message and record the request outcome. Request-boundary failures may be retried while submission is unsuccessful. A timeout/lost response leaves acceptance unknown rather than proving rejection and must not trigger blind resubmission. Response classification remains subject to D03 and Section 7 question 5.
- An explicit `callsign already in use` rejection permits bounded delayed retries of the same message, retaining its original sender, recipient and content. Keep the message in the in-app log throughout; retry exhaustion must not block the rotation. The user-specified timing and limit are recorded in D03; remaining backoff, expiry/cancellation and restart details require PRE-06 design. A timeout or lost response is not an explicit rejection and must not trigger blind resubmission (DEC-055).
- Once Hoppie positively confirms receipt/acceptance, treat submission as complete and do not retry that message. Missing cockpit delivery/read confirmation, reconnection and application restart must not trigger resubmission. Do not expose cockpit Delivered or Acknowledged states for ordinary dispatch messages; in-app read/unread state concerns the local log only.
- If Hoppie is unconfigured or submission fails, the in-app ACARS log remains available and rotation operation continues normally. This fallback does not require an eventual-delivery queue or a cockpit acknowledgement workflow.
- Clearly identify preliminary versus final dispatch information.
- Prevent transmission of unsupported or misleading final OFP values.
- Do not represent server acceptance as cockpit display, pilot reading or acknowledgement without service-supported evidence. Aircraft monitoring compatibility does not imply Hoppie compatibility.

Preliminary dispatch messages contain:

- Next-flight identifier and route.
- Estimated off-block/departure time, where available.
- Planned block fuel from the advance SimBrief calculation, where available.
- Estimated inbound arrival fuel based on the current leg's fuel-burn and arrival-fuel figures from the OFP or supported Navigraph/SimBrief API data, where available, explicitly labelled as a planning estimate.
- Passenger count, if available.

For MVP, use the current leg's fuel-burn figures and estimated arrival fuel supplied through either the OFP or a supported Navigraph/SimBrief API. Neither source is mandatory in isolation; verify the available fields, their semantics and association with the relevant flight plan. Account for the planning data's alternate-fuel allowance when the aircraft has diverted to that planned alternate, according to the verified meaning of the returned fields. Do not assume the alternate allowance has been consumed on a normal destination arrival or deduct it twice when an alternate-arrival figure already includes that burn. Field mapping and handling of an unplanned diversion remain technical questions; existing diversion/recovery holds and the single automatic-message rule remain unchanged.

**Reference evidence — static source inspection, 17 November 2026:** ACARS Link's [Landing Data template](https://github.com/availoff/acars-link/blob/25c7d568e850be5ae456ccb873ca80362e139182/packages/scenarios/base/landing_data.yaml) uses `ofp.fuel_landing_kg`; its [scenario context](https://github.com/availoff/acars-link/blob/25c7d568e850be5ae456ccb873ca80362e139182/packages/core/src/scenario/context.ts) maps this to `planLandingKg`, which its [SimBrief OFP parser](https://github.com/availoff/acars-link/blob/25c7d568e850be5ae456ccb873ca80362e139182/packages/core/src/ofp/parse.ts) reads from `plan_landing`. One [test fixture](https://github.com/availoff/acars-link/blob/25c7d568e850be5ae456ccb873ca80362e139182/packages/core/test/fixtures/ofp/rctp-rjbb-a35k-kgs-tlr.json) is consistent with planned block fuel minus planned taxi fuel minus planned enroute burn: 22,677 − 600 − 11,944 = 10,133 kg. This is a third-party planning-data example, not evidence of a live aircraft/FMS prediction or a universal field equation. ACARS Link reads the supplied value; it does not calculate this subtraction for that message. Confidence is high for the inspected source path and fixture, not for live operation or all SimBrief plans. Verify field semantics, units, rounding and diversion treatment before adopting a mapping; DEC-042/043 and C05 remain unchanged.

Do not build a separate live gate-fuel prediction for pre-dispatch. Actual uplift is the loading calculation of next-leg required block fuel minus fuel at the gate; that calculation and loading/refuelling instructions fall outside the application's remit. Keep planned block fuel and planning-data-based estimated arrival fuel distinct, use compatible units, and do not label either as actual uplift.

Missing fuel-planning information must not block the other available preliminary information. Mark the affected planning figure unavailable rather than inventing it. The previous requirement to display **Uplift unavailable** is superseded: actual uplift is not an MVP message field. This applies to both the internal message and Hoppie transmission.

FMC/aircraft-SDK predictions, including estimated fuel at top of descent, and adjustments using actual fuel at engine start to account for extra fuel taken by the pilot are outside MVP. Retain them as future enhancements under C05; they are not prerequisites for preliminary messaging.

Preliminary figures must be clearly labelled and must not be represented as confirmed OFP data.

**Scope restriction:**

The message centre is not a general-purpose Hoppie ACARS or CPDLC client.

Generic CPDLC communications, METAR alerts, ATIS retrieval, oceanic clearances and arbitrary outgoing messages are outside MVP scope.

### M10 — Persistent Integration Status

The application must provide persistent visibility of critical integration states.

The navigation sidebar must display exactly two primary connection indicators:

**SimConnect**

- Connected.
- Connecting.
- Disconnected.

**Navigraph**

- Signed In.
- Signed Out.
- Authentication Expired.

Requirements:

- Indicators remain visible across application screens.
- Connection states update as the underlying integration state changes.
- Authentication expiry must be distinguishable from ordinary connectivity failure.
- Users must be able to access relevant reconnection or re-authentication actions.
- The application must not display stale simulator-derived values as live after disconnection.
- Last-known values may remain visible if explicitly identified as stale.
- Attempt automatic SimConnect reconnection while retaining the active leg. Suspend telemetry-dependent actions while current telemetry is unavailable, then resume from the next valid observation under M16 without requiring user confirmation for an ordinary temporary disconnect.
- Hoppie configuration and connection testing remain accessible through Settings.

Connection indicators must reflect actual connection/authentication state rather than simply the presence of saved credentials.

### M11 — Rotation Dashboard and Selected-Leg Details

Provide a single Rotation workspace containing the schedule and selected-leg information.

After Start Rotation, show a loading/status view while the first OFP is being generated. Clearly indicate that startup is in progress and awaiting SimBrief; do not present the rotation as started before the OFP arrives. After the bounded retry cycle exhausts, remove the overlay, show the problem and offer Retry, retaining all inputs and the unstarted rotation.

The workspace has two presentation states:

**Details closed**

- The rotation schedule uses the available content width.
- Completed, active and pending legs remain visible.
- The active leg is visually distinct.
- Selecting a leg opens its details.

**Details open**

- The schedule remains visible.
- A details drawer presents information for the selected leg.
- The user may close the drawer without changing the selected or active flight state.
- Pending-leg and Active pre-departure editing is performed within the drawer.
- Show subsequent generation through a toast/loading indicator without an app-wide or generation-specific edit lock. Apply M01 operational editing eligibility and invalidate stale requests when inputs change.
- Current-leg planning is read-only while engines run or during taxi-out. A pre-flight parked/engines-off return to gate reopens edits; established airborne flight and completion lock it permanently. Actuals remain non-editable. Future pending legs remain editable; recovery controls are separate.
- Show **Out of date** against an OFP affected by planning edits, and expose **Regenerate OFP** while that leg is eligible and its planning remains unlocked.

The same schedule data and component behaviour must be maintained in both states.

#### Schedule Information

Each leg must display:

- Flight identification.
- Departure airport and UTC timing, distinguishing Scheduled, Filed and Actual; explicitly indicate unknown timing.
- Arrival airport and available UTC timing, with the same distinction.
- Applicable departure and arrival time differences.
- Separate departure and arrival timing status, where each has a valid scheduled comparison.
- Flight lifecycle state.
- Current flight phase for the active leg.

Timing differences and each event's early/late status are shown only where a valid scheduled comparison exists. An unknown schedule or unavailable estimate/actual must not be presented as ON-TIME. Provide the M04 manual RTO button only while the active leg is in TAKEOFF.

Present departure as off-block timing and arrival as on-block timing. Persistently show **Scheduled versus Actual** for each event, in the style of the product owner's Volanta reference. Hovering over the corresponding time shows **Scheduled versus Filed**, with both values labelled. Keep Actual visibly unknown until the simulator event is observed; do not substitute Filed for a missing Actual. All values use UTC unless the optional local-time display is enabled. No app-generated real-time ETA or single aggregate timing status is required in MVP. This defines information visibility, not a requirement to reproduce Volanta's complete layout.

Completed legs are collapsed by default and may be expanded.

Pending legs use a compact presentation.

The active leg displays a flight progress indicator.

The progress indicator must include a moving aircraft marker positioned at the leading edge of the completed portion.

No additional flight telemetry or summary strip is required beneath the active flight progress indicator.

#### Timing Difference Rules

Departure and arrival differences must be displayed individually, adjacent to their respective UTC times.

They use signed minute values.

| Time difference | Colour |
|---|---|
| 1–30 minutes late | Amber |
| More than 30 minutes late | Red |
| On time to 15 minutes early | Green |
| More than 15 minutes early | Blue/cyan |

#### Separate Departure and Arrival Timing Status

| Status | Deviation |
|---|---|
| ON-TIME | 10 minutes early to 10 minutes late |
| DELAYED | 11–30 minutes late |
| LATE | More than 30 minutes late |
| EARLY | More than 10 minutes early |

Apply these timing statuses independently to departure and arrival when their comparison inputs exist. They remain separate from lifecycle state, flight phase and individual time-difference colours. Departure delay must not overwrite arrival status, or vice versa; a late departure can coexist with an on-time arrival.

### M12 — Optional Airport-Local Time Display

Provide a **Show Local Times** toggle directly on the Rotation workspace.

UTC must remain the primary time reference.

When enabled:

- Display airport-local time beneath the corresponding UTC time.
- Enclose the local time in parentheses.
- Use smaller, secondary text to distinguish it from UTC.
- Calculate local time independently for the departure and arrival airports.
- Apply the appropriate timezone and daylight-saving rules for the flight date.
- Apply the setting consistently to completed, active and pending legs.
- Apply the setting in both details-open and details-closed states.
- Preserve the +/- delay indicators against the UTC times.

When disabled, the Rotation workspace shows UTC only.

The toggle changes presentation only.

It must not change stored timestamps, dispatch timings, delay calculations or SimBrief flight-plan data.

This is a Rotation workspace control, **not a global setting under Settings**.

### M13 — ACARS Message Notifications

- Display an unread-message count beside ACARS in the navigation sidebar.
- Count only unread application-specific messages.
- Update the badge as messages are received and read.
- Preserve unread state across application restarts.
- Allow users to open the corresponding message from the message centre.
- Do not mix unrelated Hoppie network traffic into the unread count.

The application should distinguish message availability from Hoppie transmission availability.

### M14 — Application Settings and Credentials

Provide a focused settings interface for supported integrations and dispatch preferences.

**Navigraph**
- Authentication status.
- Sign in and sign out.
- Re-authentication.
- Account information where available.

**SimBrief**
- Relevant SimBrief account identity or Pilot ID.
- Required flight-planning configuration.

**Hoppie**
- Logon/key configuration.
- Secure credential storage.
- Key update and replacement.
- Enable/disable external transmission.
- Connection testing where supported.

**Simulator**
- SimConnect connection status.
- Automatic connection configuration where supported.

**Dispatch defaults**
- Automatic OFP generation enabled/disabled.
- Pre-dispatch proximity threshold in minutes, default 20, calculated from destination distance and current groundspeed. Explain that this is an approximate trigger setting, not a landing/gate ETA or a guaranteed number of minutes before arrival.
- Automatic arrival-trigger OFP generation preference, including its shutdown fallback.
- Default turnaround time.
- Taxi-in fallback.
- Optional default dispatch weight units.

**Notifications**
- New application ACARS messages.
- OFP generation success/failure.
- Relevant connection failures.

Settings should not duplicate the Rotation board's local-time toggle.

Simulator telemetry dashboards, protocol monitoring and unrelated operational configuration are not required.

### M15 — Local Persistence and Recovery

- Persist the single current working rotation, including pending legs, active-leg progress and completed-leg history. Preserve configuration, schedule baselines, observed timings, phase/lifecycle, planning locks, OFP associations and dispatch states required to continue after normal closure or unexpected application termination.
- Automatically restore that previously monitored leg and resume from valid current simulator telemetry using M16's phase-skipping rules. This is recovery of existing progress, not late attachment to an untracked flight. Do not invent event times missed while the application was closed.
- Preserve the recovery holds and dispatch/message outcome information needed to avoid bypassing an explicit user confirmation or repeating successful external actions after restart. Retain application-specific ACARS message history and read/unread state for the current working rotation.
- Do not provide multiple saved rotations, a rotation library or reusable rotation/flight templates in MVP. The CSV import-format example remains separate from reusable operational templates.
- Preserve relevant user preferences, including the Rotation local-time display preference.
- Store authentication credentials securely using appropriate Windows-supported mechanisms.
- Avoid exposing credentials in logs, exports or routine diagnostic information.
- Recover gracefully from unexpected application or backend-process termination. This and normal restart form the first bounded persistence-validation scope. OS-crash, sudden-power-loss and device-cache failure guarantees remain explicit PRE-09 decisions; do not claim those guarantees or expand into additional recovery machinery without agreeing the required scope (DEC-054).
- Do not repeat locally known successful planning or accepted Hoppie submissions after restart. Preserve SimBrief retry-cycle accounting; remote duplicates after missing/unusable OFPs are accepted only under DEC-059. Hoppie uncertain outcomes never trigger blind resubmission.
- Persist replacement/automatic clearing under M01 so restarting cannot restore a discarded rotation. Retention of the working rotation's history ends when it is cleared; user settings, credentials and reusable airline/turnaround profiles remain.

Persistence must not require a proprietary backend service.

JSON working-state files are the preferred storage direction, with SQLite as fallback if validation demonstrates unsuitability or disproportionate writer complexity. No writer or complete schema is proven. Apply DEC-060: related changes commit transactionally; failed saves show an error and adopt no unsaved operational state or dependent external effects. Uncommitted form input may remain available for retry. If working state cannot be read, preserve it, show a recovery error and offer a fresh rotation; never silently reset or roll back. Settings and credentials are separately stored and unaffected. Persist diversion intent, holds and recovery acceptance; restart restores the committed choice.

### M16 — Operational State Integrity

Maintain distinct state models for:

**Leg lifecycle**
- Pending.
- Active.
- Completed.

**Manual rotation commencement and first-leg activation:** Starting a configured, not-yet-started rotation always requires an explicit user action. SimConnect readiness alone must not commence the rotation or activate its first leg. Retain the startup eligibility conditions: SimConnect connected, aircraft confirmed in-world rather than menus, on ground, parking brake set and all propulsion engines off. Confirm the departure airport as an additional condition if reliable airport identification is feasible. A cold-and-dark cockpit is not required; APU/external power and powered turnaround states are allowed. Valid, current telemetry and confirmed world readiness are required. The initial parked state must not itself complete the leg. Existing active/completed progress must not be reset merely because these conditions recur. Automatic recovery of an already-started rotation and subsequent-leg handover remain supported; neither is a new rotation commencement.

**Subsequent-leg handover:** After flight, the inbound leg completes only when confirmed on ground, stationary with all engines stopped. Preload the next eligible leg so it can be monitored without waiting for the normal activation interval. It becomes Active ten simulator minutes after inbound completion, or immediately Active/DEPARTING if a qualifying departure occurs before that interval expires. The timer must not subsequently activate it a second time. The first-leg startup rule does not replace this normal handover rule. Accepted recovery is the DEC-056 exception: immediate activation with approval-time filing and no turnaround allowance. Missing touchdown or an exceeded taxi-in estimate does not prevent this valid completion; retain unknown event timestamps and all airport/recovery holds under M05 and DEC-049.

**Startup completion:** Start Rotation initiates first-leg OFP generation and shows startup/generation in progress, using M06's app-wide loading overlay. The first leg remains Pending and the rotation has not commenced until the matching OFP is successfully returned by SimBrief, subject to startup eligibility. A request acknowledgement alone does not qualify. On successful receipt, associate the OFP with the first leg, apply Scheduled/Filed timing rules and commence the rotation with that leg Active. Apply M06's initial-plus-three retry cycle; exhaustion leaves the rotation unstarted, removes the overlay and offers Retry without input loss. The initial parked state must not immediately complete the newly Active leg.

**No late attachment in MVP:** Attaching to or importing an already-underway flight as the current monitored leg is outside MVP scope. Do not offer an Attach to current flight action or infer a new active leg from airborne telemetry when none was previously active. Users may prepare a future rotation/schedule while airborne, but cannot dispatch it until the aircraft is on the ground; first-leg activation still requires the existing M16 startup conditions. This restriction does not prevent reconnection recovery of a leg the application was already monitoring. Late attachment may be reconsidered after MVP; no future implementation is committed.

**First-OFP generation scope:** Retain ordinary startup eligibility, response association, loading/status display and failure handling. Do not add a special readiness-loss recovery workflow for the unlikely case of the aircraft moving while the first OFP is being generated. The product owner considers this unnecessary for MVP because the OFP is needed for preflight; it is not an outstanding product decision or a reason to add more startup states.

**Planning lock:** Apply M01/DEC-058. Current-leg edits require fresh grounded/stationary/engines-off telemetry. Engine start/taxi-out closes editing, but a return to gate before any established airborne flight can reopen it without changing recorded actuals. Airborne/completed legs remain locked. Subsequent generation itself does not lock eligible inputs; revisions reject obsolete responses. First-leg generation blocks UI interaction only through the startup overlay.

**Declared diversion intent (DEC-056):** Provide a Divert action to enter and confirm an intended ICAO. Before confirmed touchdown, permit changing that airport or cancelling intent. Preserve the original planned route. Intent immediately pauses onward planning, messaging/retries, activation and schedule progression; monitoring and actual timestamp recording continue. Do not interpret this hold as freezing simulator UTC. Pause existing preparation without acting on its results; retain enough current work to resume from the paused point if intent is cancelled. Cancellation is explicit approval to reevaluate/resume normal eligibility, not permission to repeat successful actions or release unrelated holds.

Actual identified arrival, not the declared airport, determines normal arrival, return or diversion. Landing at the original destination resolves the intent through normal arrival; landing elsewhere converges with automatic abnormal-arrival detection on the same recovery hold. Unknown airport identity retains a hold. Persist intent and holds across restart; elapsed time and aircraft movement cannot release them.

**Returns and diversions:** Recognise a confirmed landing at the departure airport after an established airborne state as a return to departure. Recognise a confirmed landing at another airport that is not the planned destination as a diversion. Record the actual arrival airport separately from the planned destination. The inbound remains Active until stationary with all engines stopped, then completes with its arrival outcome retained.

- Suspend automatic onward OFP generation and next-leg activation following either outcome until the user confirms or adjusts the remaining rotation. Neither the ten-minute activation timer nor early-departure handover may bypass this suspension.
- Apply that suspension as soon as the unexpected arrival is confirmed. Show the recovery choices once the aircraft is stationary with all engines stopped and the inbound leg completes.
- After a return to departure, ask whether the user wishes to **re-dispatch the flight**.
- If accepted, create an ordinary new leg with a new identity and generate a fresh OFP using updated planning conditions. Acceptance immediately activates it, releases the resolved recovery hold and starts the fresh workflow; no separate Resume, turnaround allowance or ten-minute wait applies. Use approval-time simulator UTC as requested off-block, retaining returned Filed and observed Actual separately. No permanent recovery-of/lineage relationship or special recovery-leg subtype is required (DEC-053). Preserve the original leg's recorded timings, fuel data, OFP association and return outcome independently. Recovery holds may identify the original arrival while the choice is being resolved; this is workflow context, not permanent lineage. Weather, runway selection and other planning conditions may have changed; do not simply reset the original attempt or reuse its plan.
- After a diversion, ask whether the user wishes to **add a repositioning flight**.
- Default the repositioning flight's departure to the actual diversion airport and its destination to the diverted leg's original planned destination. Allow the user to edit the destination before OFP generation.
- Apply the same immediate-activation/approval-time filing rule to accepted repositioning. Default its ATC callsign to the first up-to-six characters of the affected flight's callsign plus R (EZY1234 → EZY123R); keep its optional IATA flight number unchanged. The default is editable before generation, subject to validation. This is a product naming rule, not verified vendor format compatibility.
- On recovery acceptance, reset preparation for the remaining unflown sequence, preserving completed history, remaining leg identities/user inputs, all Scheduled baselines by default, and original ACARS audit messages. Discard superseded generated plans/preliminary data and invalidate pending callbacks. No complete version-history system is required. Fresh workflows may generate fresh automatic messages; historical messages are not a retry queue or a suppression marker for the rebuilt workflow (DEC-057).
- Present these as choices; do not automatically create or dispatch a recovery flight. Leaving the choice unanswered does not resume the existing onward sequence.
- Also offer **skip recovery and continue with the next scheduled leg**. This creates no recovery leg or OFP; the user is responsible for manually repositioning the aircraft to that leg's departure airport. Preserve the completed return/diversion outcome rather than recording a recovery flight that did not occur.
- After skipping recovery, require an explicit **Resume next leg** action once the user has repositioned. Keep onward automatic dispatch, activation and departure detection suspended until that confirmation. Loading, relocation, elapsed handover time or detection at the expected airport must not resume the leg automatically; movement observed during the suspension must not be recorded as its departure. Confirmation releases this recovery suspension; it does not bypass other applicable telemetry and dispatch eligibility checks.
- Automatically identify the actual arrival airport reliably in normal supported operation. Manual airport confirmation is an exceptional recovery path, not a routine step or a substitute for robust detection. Do not assume the planned destination is the actual arrival or present an uncertain identification as a confirmed diversion.
- If arrival-airport identification remains unavailable or ambiguous, hold automatic onward dispatch and activation and ask the user to confirm the actual airport. Apply the normal arrival, return or diversion rules to the confirmed airport. Continue to recognise landing and stationary/shutdown completion independently of unresolved airport identity.
- Re-dispatch as a new leg with preserved original history, the repositioning destination default, recovery prompt timing and airport-confirmation fallback are agreed. The airport-identification method and its reliability require technical validation.

**Flight phase**
- Departing.
- Takeoff.
- Climb.
- Cruise.
- Descent.
- Final Approach.
- Landed.
- Parked.

**Timing status — independently for departure and arrival**
- On-Time.
- Delayed.
- Late.
- Early.

When the relevant scheduled baseline or estimated/actual event time is unavailable, its timing status is unknown. Do not derive a single aggregate status from these two comparisons.

**Dispatch status**
- Waiting.
- Scheduled.
- Generating.
- Ready.
- Failed.

For an existing OFP, distinguish whether it still matches the leg's planning inputs or is **Out of date**, independently of the generation request's status. A pending or failed regeneration must not erase that distinction.

**Connectivity**
- Connected.
- Connecting.
- Disconnected.
- Authentication expired, where applicable.

These states must not be treated as interchangeable.

The system must distinguish estimated values from actual recorded values and must not silently promote provisional data to confirmed status.

Phase history must support recovery from missed transitions; it is not a mandatory checklist of every intermediate phase. Preserve reliable observed event timings independently of the currently displayed phase. Unobserved event timestamps remain unknown; manual entry/correction is outside MVP scope.

**Temporary SimConnect disconnect:** Retain the active leg and its established history and reconnect automatically. Resume phase evaluation and eligible telemetry-dependent actions from the next valid, current in-world observation. Do not wait for missed intermediate phases or require a recovery confirmation. For example, if TAKEOFF occurred during the gap and the recovered telemetry establishes CLIMB, transition directly to CLIMB and apply the departure planning lock. Retain normal signal-validity/phase-confirmation checks, without imposing an additional recovery delay. Do not fabricate missed event timestamps or substitute reconnection time as actual takeoff time. Existing return/diversion or manual-repositioning suspensions remain in force, and reconnection must not repeat successful dispatch actions.

---

### M17 — Resource Efficiency Alongside the Simulator

AutoDispatch must minimise CPU, memory, GPU and disk overhead while running alongside MSFS 2020/2024. Resource efficiency is a primary framework/stack selection criterion, including the combined cost of the UI, backend, runtimes and any integration helpers. Preserve clear backend/presentation separation under DEC-044.

Monitoring and dispatch must remain reliable when the window is minimised or obscured, while unnecessary presentation work is reduced. Long-running rotations must not cause unbounded memory or log growth. Efficiency changes must preserve required detection accuracy, latency and recovery behaviour.

Agree measurable budgets and representative hardware/scenarios during architecture discovery, then validate the complete packaged application. No numerical CPU/RAM/FPS target or framework performance ranking has yet been accepted. See AC16 and question 20.

---

## 3. Should Have — Post-MVP Improvements

### S01 — Enhanced Manual Recovery

Provide improved recovery workflows for missed simulator events, incorrect flight detection and incomplete turnaround information.

Manual event-time editing is explicitly excluded from MVP. Any future reconsideration requires a separate product decision; it is not implicitly committed by this broader recovery item.

### S02 — Rotation Export and Summary

Allow export of completed rotation information, including scheduled versus actual timings and relevant dispatch history.

This is post-MVP. Its eventual design must account for M01's automatic clearing after the final leg; an export opportunity or output must be arranged before the working data is discarded. It does not introduce an MVP archive.

This is separate from maintaining a library of saved rotations.

### S03 — Improved Operational Notifications

Provide configurable desktop notifications for important dispatch and rotation events without requiring the application to remain in the foreground.

### S04 — Enhanced Dispatch History

Provide clearer access to previously generated OFPs and associated dispatch events for the current rotation.

### S05 — Configuration Import and Export

Allow import/export of relevant airline profiles, operational defaults and application configuration without exporting secret credentials.

### S06 — Suggested Rotation Timetable

Where supported planning data can supply suitable block-time estimates, propose scheduled times for all legs from the first departure, block times and configured turnarounds. Allow users to adjust the proposed times. This must not require undocumented SimBrief capabilities or independently replace SimBrief planning calculations.

### S07 — Full Rotation Delay Propagation

Propagate consequential delays and recovery opportunities through a complete known rotation timetable. This extends M05's MVP support for a leg's own delay and future-leg departure estimates against manually supplied schedules. Do not manufacture missing schedule baselines or durations.

### S08 — Real-Time Arrival Estimates

Post-MVP (day two), investigate and introduce real-time arrival estimates where a reliable source or calculation method can be validated. Distinguish these estimates from OFP-filed planning times and simulator-time actuals, without overwriting the scheduled comparison baselines. Data sources, method, accuracy expectations and any use in downstream scheduling require later discovery; this feature is not a dependency for MVP or its proximity-based pre-dispatch trigger.

---

## 4. Could Have — Future Opportunities

### C01 — Career Management Integration

Optional integration with external flight-simulation career and scheduling tools, including A Pilot's Life v2.

The core application must not depend on these systems.

### C02 — Expanded Hoppie Capabilities

Consider additional application-specific ACARS capabilities, and potentially broader messaging features, in a later release.

These require separate requirements and scope approval.

### C03 — Enhanced Scheduling Insights

Provide optional historical analysis of turnaround performance, recurring delays and schedule recovery.

### C04 — Additional Simulator Support

Consider simulators beyond the MSFS 2020 and MSFS 2024 targets where technical feasibility justifies the work. Validation of those two target versions belongs to M04/D02, not this future opportunity.

### C05 — Enhanced Preliminary Fuel Information

Consider aircraft FMC/SDK fuel predictions, including estimated fuel at top of descent, and actual fuel at engine start to account for pilot-selected extra fuel beyond the OFP block amount. These are future enhancements, not MVP dependencies. Validate aircraft-specific availability and the meaning of each prediction before use. They do not bring actual uplift calculation or loading/refuelling execution into scope.

Destination estimated fuel on board (EFOB) is a specific future data requirement, distinct from fuel at top of descent, current onboard fuel and OFP/API planning figures. **No aircraft currently has validated automatic numerical destination-EFOB extraction in this project.** See D02's evidence register, proposed adapter approach and deferred proof-of-concept criteria. Transport availability alone does not establish the required datapoint. MVP continues to use the planning sources in DEC-042.

**Research resource — FlightPadFMC (noted 14 November 2026):** [diymarcus/FlightPadFMC](https://github.com/diymarcus/FlightPadFMC) is a candidate reference for the deferred aircraft-integration pass. Its README describes CDU/MCDU display access through PMDG SimConnect SDKs (737/777), iFly plugin IPC/shared memory, FlyByWire SimBridge and Fenix GraphQL. This review covers the repository documentation, not a source-code audit or live test. Display access does not establish independent, structured access to predicted fuel values. Later investigation should distinguish screen parsing from underlying data, check whether reading requires changing the pilot's selected page, and assess source availability/reuse terms. No dependency adoption or MVP scope change is implied.

---

## 5. Won't Have — Current Scope

Manual entry or editing of actual off-block, takeoff, landing and on-block timestamps is outside MVP scope. This does not restrict editable pre-departure planning times or the specifically agreed operational recovery controls.

The initial product explicitly excludes:

- A proprietary cloud backend.
- Real-time landing/arrival ETA predictions in MVP; deferred to the post-MVP backlog under S08. OFP-filed planning times, the proximity-only pre-dispatch trigger and agreed turnaround-readiness arithmetic remain in MVP scope.
- Multi-user or shared dispatch operations.
- Multiple simultaneously managed working rotations.
- A saved rotation library.
- Reusable rotation or flight templates in MVP (distinct from the CSV import-format example).
- Individually saved reusable flight legs.
- Aircraft fleet management.
- Aircraft inventory or standby aircraft tracking.
- Airline career progression or financial simulation.
- A replacement flight-planning engine.
- Independent final passenger, fuel or weight calculations that override SimBrief.
- Aircraft loading, refuelling or ground-handling execution.
- Actual fuel-uplift calculation from next-leg block fuel and fuel at the gate, or loading/refuelling instructions.
- Live gate-fuel prediction, FMC/SDK fuel predictions and engine-start extra-fuel adjustments in MVP; potential enhanced planning information is deferred under C05.
- General-purpose Hoppie messaging or CPDLC.
- METAR alerting, weather broadcasting or generic ATIS retrieval.
- Unrelated simulator telemetry dashboards.
- Airway corridor maps and decorative route-visualisation features.

---

## 6. External Dependencies and Constraints

### D01 — Navigraph/SimBrief API

The product depends on confirmation of:

- Applicability of the documented desktop Device Authorization Flow with PKCE to the approved SimBrief generation API, including this application's client registration and scopes.
- Access to existing OFP data.
- Automated OFP generation capabilities.
- Preview calculations without duplicate saved plans, or an acceptable same-plan edit/regeneration workflow.
- Availability and capabilities of any newer API versions.
- Appropriate rate limits and usage conditions.
- Whether unattended dispatch is permitted for this application.
- Async generation status, error/timeout reconciliation, cancellation, duplicate prevention and whether preview/generation changes the user's latest OFP.
- Whether an authenticated GET/list endpoint exposes the user's personal saved airframes, its V2 availability, required permissions/scopes, returned fields and how a selected ID is used for generation.

The application connects directly from the user's computer using user-authorised credentials, without a central proxy service.

API availability and permissions must be verified before unattended dispatch functionality is committed as deliverable.

Public evidence indicates that a newer SimBrief API exists, but its available contract and permission for this application's workflow are not established. Do not confuse a JSON output-format version with the generation API version. Navigraph clarification is pending; the product owner has prepared an enquiry covering access, documentation and the outstanding workflow questions.

**Public evidence update — 18 November 2026:** [Detailed findings and remaining questions](docs/architecture/simbrief-discovery.md) distinguish documented capability, staff responses, third-party reports and the two public catalogue checks. [Navigraph documents desktop device flow with PKCE and rotating refresh tokens](https://developers.navigraph.com/docs/authentication/device-authorization); its [TypeScript/JavaScript SDK guide](https://developers.navigraph.com/docs/sdk/getting-started) offers configurable auth storage but documents Charts as its exposed service API. These answer the general authentication/SDK questions, not SimBrief generation permission or SDK compatibility with our process boundaries. [Staff direct REST applicants to dev@navigraph.com](https://forum.navigraph.com/t/simbrief-rest-api/19970). July/August 2026 V2 threads linked in the findings show reported credentials/scopes and private staff follow-up, not a public generation contract.

**Legacy planning contract — documented, not V2 validation:** [V1 documentation](https://developers.navigraph.com/docs/simbrief/using-the-api) provides `static_id` correlation across website edits/regeneration and later plans, plus dispatch inputs and field-specific weight units. [The API reference](https://forum.navigraph.com/t/the-simbrief-api/5298) documents `acdata.maxpax` and use of one saved-airframe Internal ID. These answer whether those legacy inputs/mechanisms exist; current enforcement, V2 equivalents, in-place API regeneration and idempotency remain unverified. The product owner's expectation that V2 retains `static_id` or equivalent is recorded as assumption A-SB-01 in the findings, not an accepted API fact. Preserve DEC-058/059 editing, response-revision and bounded-retry policy while validating the provider contract.

**Catalogue retrieval check — 18 November 2026:** Unauthenticated reads of [inputs.list.json](https://www.simbrief.com/api/inputs.list.json) and [inputs.airframes.json](https://www.simbrief.com/api/inputs.airframes.json) returned HTTP 200 and parseable catalogue JSON. This supports the M02 catalogue fallback; it is not personal-airframe enumeration or a generation test. No user OFP, private credentials or authenticated API operation was accessed.

**Saved-airframe investigation (14 November 2026):** The [public V1 documentation](https://developers.navigraph.com/docs/simbrief/using-the-api) supports passing a saved airframe's Internal ID in place of the aircraft type; it also warns that deleting the saved airframe invalidates later requests. The [published aircraft-list endpoints](https://forum.navigraph.com/t/getting-currently-supported-aircraft-layout-options/5296) supply the general aircraft/layout catalogue, not evidence of personal saved-airframe enumeration. A [2022 SimBrief staff response](https://forum.navigraph.com/t/retrieving-a-users-fleet-through-api/10221) said no public user-fleet API existed at that time; this does not establish current V2 capabilities. An [August 2026 question requesting personal saved-airframe access](https://forum.navigraph.com/t/pull-saved-airframes-data-via-api/24032) has no visible reply in the inspected page. Current authenticated saved-airframe listing remains **unconfirmed**, not established as unsupported. Fallback: manual setup or an optional single airframe ID under M02.

**Question for Navigraph:** Does SimBrief API V2 provide a supported authenticated GET/list endpoint for the signed-in user's saved airframes? Please provide the endpoint documentation, required permissions/scopes, returned identifiers and descriptive/configuration fields, any pagination/usage limits, and how the selected airframe is referenced during generation from a directly authenticated desktop application.

### D02 — SimConnect

Flight monitoring depends on the availability and reliability of simulator telemetry.

Some operational events require inference. MVP supports only the explicitly agreed manual recovery controls, not arbitrary correction of recorded event timestamps.

**Departure-signal documentation review (14 November 2026):** The [SimConnect API reference](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/SimConnect_API_Reference.htm) separates data subscriptions from system-event notifications. [RequestDataOnSimObject](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/Events_And_Data/SimConnect_RequestDataOnSimObject.htm) supports periodic or changed-value observations of the user's aircraft. These observations are inputs to AutoDispatch's lifecycle inference, not a documented gate-departure event.

| Required capability | Documented evidence | Assessment and remaining limitation |
|---|---|---|
| Movement and position | `GROUND VELOCITY`, `PLANE LATITUDE`, `PLANE LONGITUDE`: [2020](https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Aircraft_SimVars/Aircraft_Misc_Variables.htm), [2024 retail](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simvars/aircraft-simvars/aircraft-miscellaneous-variables/) | Available in the documented interface; departure intent and confirmation thresholds remain inferred. |
| Ground contact | `SIM ON GROUND`: [2020](https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Miscellaneous_Variables.htm), [2024 retail](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simvars/miscellaneous-variables/) | Ground flag available; bounce/go-around filtering still required. |
| Parking brake | `BRAKE PARKING POSITION`: [2020](https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Aircraft_SimVars/Aircraft_Brake_Landing_Gear_Variables.htm), [2024 retail](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simvars/aircraft-simvars/aircraft-brake-and-landing-gear-variables/) | Boolean state documented; validate add-on mapping. Brake release alone does not establish departure. |
| Engine operation | Indexed `ENG COMBUSTION`, `GENERAL ENG COMBUSTION`, RPM/N1/N2 and engine count: [2020](https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Aircraft_SimVars/Aircraft_Engine_Variables.htm), [2024 retail](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simvars/aircraft-simvars/aircraft-engine-variables/) | Standard per-engine signals exist. Validate starting/shutdown behaviour; combustion cessation and spool-down are distinct. No universal add-on reliability established. |
| Beacon | `LIGHT BEACON` / `LIGHT BEACON ON`: [2020](https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Aircraft_SimVars/Aircraft_System_Variables.htm), [2024 retail](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simvars/aircraft-simvars/aircraft-system-variables/) | 2024 documents circuit names/indices; do not assume identical lookup semantics across versions or aircraft. Supporting evidence only until validated. |
| Pushback (not selected) | `PUSHBACK STATE`, `PUSHBACK ATTACHED`, `PUSHBACK WAIT`: [2020](https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Services_Variables.htm), [2024 retail](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simvars/services-variables/) | STATE documents direction, not a universal active flag; ATTACHED describes the service vehicle. Coverage of GSX and other providers is unconfirmed. DEC-041 excludes these signals from departure detection. |

The [2020 interactive-point documentation](https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Aircraft_SimVars/Aircraft_FlightModel_Variables.htm) exposes opening/deployment and point type, including doors, hoses and cables. This is not an aircraft-independent all-doors-closed flag. Retain this as research history only: door checks are excluded from departure detection under DEC-041.

**Recommended validation, not an accepted detection rule:** Use Microsoft's [SimvarWatcher C# sample](https://docs.flightsimulator.com/msfs2024/retail/samples-tutorials/samples/visualstudio/simvarwatcher/) to observe engine-off pushback, self-powered departure, stationary brake/beacon changes and engine shutdown on target aircraft/simulator combinations. Compare movement with brake/beacon/engine evidence, including slow movement around the proposed 3 kt threshold. Keep engines-running optional for departure so engine-off pushback remains possible. If standard values prove unreliable, investigate documented aircraft-specific adapters under the existing compatibility policy; no adapter or final combined rule is selected by this review.

Validate both simulator versions and the aircraft targets in M04. SDK documentation identifies standard position, engine, ground-speed and autopilot-altitude information, plus airport facilities and identifiers; this does not prove that each aircraft publishes reliable values for every required event. Airport identification from position is a candidate approach, not a verified direct "current airport" signal.

**PMDG 737 SDK review (14 November 2026):** The supplied [PMDG 737 SDK manual](E:/MSFS24/Packages/Community/pmdg-aircraft-738/Documentation/SDK/PMDG_737_MSFS_SDK.pdf), dated December 2025, documents a read-only state block delivered through SimConnect client data (pages 6–10). The adjacent [SDK header](E:/MSFS24/Packages/Community/pmdg-aircraft-738/Documentation/SDK/PMDG_NG3_SDK.h) defines `PMDG_NG3_Data`, including `LTS_AntiCollisionSw`, `PED_annunParkingBrake` and `MCP_Altitude`. These are aircraft-specific fields, not standard SimVar names; an annunciator or switch must not be assumed equivalent to physical aircraft state without validation. The [connection example](E:/MSFS24/Packages/Community/pmdg-aircraft-738/Documentation/SDK/PMDG_NG3_ConnectionTest.cpp) demonstrates changed-data subscriptions through `SimConnect_RequestClientData`. It requires the live aircraft and is not an emulator.

PMDG state broadcasting is disabled by default and requires `[SDK]` / `EnableDataBroadcast=1` in its options file. The PDF and header use different options-file names; verify the actual version-specific location before configuring anything. No simulator files have been changed and no live compatibility test has been performed. The manual also contains SDK distribution/EULA requirements (pages 18–24), including user acceptance; verify applicable current terms before adopting/distributing an adapter. This 737 review establishes a documented integration route for that family only. The separate 777-specific header/example review below now establishes its own ClientData contract; shared layouts or runtime compatibility must still not be assumed.

**Aircraft investigation sequencing:** Standard SimConnect variables remain the first approach, with SimvarWatcher as a validation aid. At the product owner's request, the initial SDK/transport discovery pass below evaluates fit with the now-accepted TypeScript backend. Detailed per-field validation and live aircraft compatibility testing remain pending. Use aircraft-specific adapters only where validated gaps justify them; SDK availability alone does not make an adapter mandatory.

**Additional references supplied by the product owner:** Originally logged without review; the subsequent supplied investigation is recorded below with its evidence provenance. These references do not establish validated numerical EFOB access.

- TFDi MD-11: [Integration guide — data export](https://docs.tfdidesign.com/md11/integration-guide/data-export).
- FlyByWire A32NX: [Systems API](https://docs.flybywiresim.com/aircraft/a32nx/a32nx-api/a32nx-systems-api/).
- FlyByWire A380X: [Systems API](https://docs.flybywiresim.com/aircraft/a380x/a380x-api/a380x-systems-api/).
- iFly 737 MAX 8: [Flight1 product page](https://www.flight1.com/products.asp?pid=iflymax8&vid=flt1sf); official SDK v1.5 download and selected headers/sample have now been inspected in the pass below.

**PMDG 777 evidence update:** Similarity to the 737 was initially a working assumption, followed by third-party FlightPadFMC evidence. The installed [777 SDK header](E:/MSFS24/Packages/Community/pmdg-aircraft-77w/Documentation/SDK/PMDG_777X_SDK.h) and [connection example](E:/MSFS24/Packages/Community/pmdg-aircraft-77w/Documentation/SDK/PMDG_777X_ConnectionTest.cpp) have now been inspected directly. They define `PMDG_777X_Data`, require `EnableDataBroadcast=1` in `777_Options.ini`, and demonstrate changed ClientData subscriptions. Candidate fields include `BRAKES_ParkingBrakeLeverOn`, `MCP_Altitude`, `FUEL_QtyCenter/Left/Right/Aux` (LBS), `FMC_DistanceToTOD` and `FMC_DistanceToDest` (NM). These quantities and distances do not establish numerical destination EFOB. The 737 and 777 require their own field layouts/semantics; no live compatibility or identical layout is claimed, and no configuration was changed.

#### Aircraft transport evidence and future EFOB investigation

**Evidence provenance:** The product owner supplied another agent's investigation on 14 November 2026. The table records its established transport/interface findings, with official documentation distinguished from third-party demonstrations and community references. Those findings have not all been independently revalidated in this session and are not AutoDispatch runtime test results. Numerical destination EFOB remains **unverified for every row**.

| Aircraft | Established mechanism reported by the supplied investigation | Evidence/source and limit |
|---|---|---|
| FlyByWire A32NX | Published custom L:vars and developer API | [Official systems API](https://docs.flybywiresim.com/aircraft/a32nx/a32nx-api/a32nx-systems-api/). The report also notes a displayed FUEL PRED destination EFOB and accuracy caveats; display presence does not establish an external numerical field. |
| FlyByWire A380X | Open-source aircraft with custom simulation systems | [Systems API reference](https://docs.flybywiresim.com/aircraft/a380x/a380x-api/a380x-systems-api/). Specific EFOB interface not established. |
| iniBuilds A340 | Published aircraft-specific L:var reference | [iniBuilds reference](https://forum.inibuilds.com/topic/32161-key-lvars-list-a340/). EFOB field not identified. |
| iniBuilds A350 | Published aircraft-specific L:var reference | [iniBuilds reference](https://forum.inibuilds.com/topic/25015-key-lvars-list-a350/). EFOB field not identified. |
| iniBuilds A380 | Community L:var/B-event lists | [Community reference on iniBuilds forum](https://forum.inibuilds.com/topic/41010-flight-sim-hardware-developer-inibuilds-a380-all-lvar-and-bevent-list/). Community discovery, not an established vendor EFOB contract. |
| Fenix A319/A320/A321 | Local GraphQL integration demonstrated by third-party MCDU software | [FlightPadFMC](https://github.com/diymarcus/FlightPadFMC). Confirm exact variant/version coverage; transport demonstration does not establish raw FMGS fuel access or a supported public API contract. |
| PMDG 737 | SimConnect ClientData aircraft-state SDK | Supplied SDK/header reviewed above; numerical destination fuel field not validated. |
| PMDG 777 | SimConnect ClientData SDK, now inspected locally | Installed header/example reviewed above; actual field behaviour and numerical EFOB remain unvalidated. |
| TFDi MD-11 | Published L:vars and MCDU SimConnect ClientData export | [Variables](https://docs.tfdidesign.com/md11/integration-guide/variables), [data export](https://docs.tfdidesign.com/md11/integration-guide/data-export). Report identifies `MD11MCDU` as display content, not a documented numerical fuel-prediction field. |
| iFly 737 MAX 8 | Official SDK v1.5 using Windows shared memory, with third-party implementations | [Flight1/iFly SDK reference](https://www.flight1.com/products.asp?pid=iflymax8&vid=flt1sf), [FlightPadFMC](https://github.com/diymarcus/FlightPadFMC). Required prediction field unverified; shared memory is not established as the only possible access method. |

**Independent SDK/transport discovery pass (14 November 2026):** Documentation/source inspection only, not runtime validation or approval of a stack. The following findings supplement the supplied evidence above.

| Aircraft/interface | Evidence checked | Implication for a TypeScript backend / outstanding work |
|---|---|---|
| PMDG 737/777 | Installed official headers/examples above. node-simconnect also includes a [737 CDU ClientData sample](https://github.com/EvenAR/node-simconnect/blob/2fca2ee3486e2e5972c2ecc3fe18592955e2c3fb/samples/typescript/pmdgCduScreen.ts). | ClientData transport already exists; write only necessary read-only field decoders with correct offsets, alignment and types. The sample also sends CDU keystrokes and must not be run unchanged for passive tests. CDU content is not a structured fuel-prediction API. |
| TFDi MD-11 | Official [integration variables](https://docs.tfdidesign.com/md11/integration-guide/variables) include `MD11_AFS_ALT` and tank readouts. [Data export](https://docs.tfdidesign.com/md11/integration-guide/data-export) specifies the packed `MD11MCDU` ClientData layout for three displays. | L:vars and ClientData fit the candidate transport. Validate selected field units/semantics; use standard telemetry first. MCDU export is display text, not a general numerical aircraft-state or EFOB block. |
| iFly MAX 8 | Downloaded official [SDK v1.5](https://files.100megabyte.com/ifly/MSFS_MAX8_SDK_v1.5.zip) into a temporary research file; inspected `SDK.h`, selected `SDK_Defines.h` fields and `737MAX_SDKDlg.cpp`. The official product page says the SDK covers MSFS 2020/2024. | Confirms `iFly737MAX_SDK_FileMappingObject`, mutex `iFly737MAX_SDK_Mutex`, `OpenFileMapping`/`MapViewOfFile` read access and mutex coordination. Node access needs a separately evaluated Windows binding/helper if required fields cannot be obtained through standard SimConnect. Respect version-specific layout/packing; do not substitute switch position for actual engine operation. No binaries executed. |
| FlyByWire A32NX/A380X | Both official systems API pages above opened. A32NX documents `A32NX_ENGINE_STATE:{index}` with OFF/ON/STARTING/SHUTTING values. | Numerical L:vars are a plausible direct SimConnect route. Do not assume the A32NX field name or state encoding applies unchanged to A380X. These are documented variable interfaces, not prebuilt AutoDispatch adapters. |
| iniBuilds A340/A350/A380 | A340/A350 forum references above provide vendor-posted variable lists; A380 reference is a member-posted L:var/B-event list. | Same candidate L:var transport, with vendor and community evidence kept separate. Required read-only fields and aircraft versions still need validation; a B-event name alone is not state telemetry. |
| Fenix family | [Official hardware integration guidance](https://support.fenixsim.com/hc/en-us/articles/12466468901135-Example-of-How-to-Bind-Switches-Knobs-and-Buttons-on-FenixSim-Aircraft-to-External-Hardware) points to installed `Cockpit_Behavior.xml` and demonstrates `S_OH_EXT_LT_BEACON`. FlightPadFMC documents GraphQL display integration for A320 v2. | Prefer standard SimVars/documented L:vars where sufficient. GraphQL remains an optional third-party-demonstrated path, not a verified public telemetry contract for every variant/current version. |
| BlueBird 757 | [Official public L:var reference](https://support.bluebirdsim.com/docs/simvars) provides access modes, units and meanings; vendor notes source checking as of 21 October 2026 without runtime/build compatibility guarantees. | Adds a documented candidate L:var route; passive readable fields need validation on the supported aircraft build. |
| FlightSimStudio E-Jets | [Official hardware integration guide](https://docs.flightsim-studio.com/e-jet-series/supplements/hardware-integration) directs developers to published L:vars in HubHop and provides ground-service variable examples. | Candidate L:var route; map only required read-only operational fields, distinguishing published variables from community hardware presets. |
| Aerosoft A340-600 | [Aerosoft staff statement](https://forum.aerosoft.com/index.php?/topic/185285-winwing-and-wingflex-hardware-support/&comment=1137013&do=findComment) says a hardware SDK exists and is being distributed to manufacturers. Installed package includes `aerosoft_hardware_api_connector.wasm`. | Public SDK access, transport and required state fields remain unverified. Presence of a WASM binary does not establish its external contract. Request developer documentation if standard telemetry is insufficient. |

**L:var scope correction:** Current [MSFS 2020 AddToDataDefinition documentation](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/Events_And_Data/SimConnect_AddToDataDefinition.htm#lvars), as well as the 2024 documentation below, explicitly describes numerical L:var access as FLOAT64. Do not assume every 2020 aircraft requires an extra WASM bridge solely to read numerical L:vars. Simulator-build support, variable visibility, freshness and actual aircraft semantics still need live validation.

**Recommended next validation:** Read-only standard telemetry first; representative PMDG ClientData and documented L:vars next; evaluate an iFly shared-memory binding/helper only for demonstrated missing data. Confirm unavailable/uninitialised/stale handling and field units. Existing vendor connection samples require live aircraft and are not verified emulators; retain the previously agreed harness/recorded-telemetry approach. No new automatic numerical EFOB capability is established by this pass, and no aircraft-control or direct aircraft ACARS bridge is proposed.

**Independently checked SDK capability:** The current [MSFS 2024 AddToDataDefinition documentation](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simconnect/api-reference/events-and-data/simconnect_addtodatadefinition/) explicitly supports numerical L:var access through SimConnect, using FLOAT64. This establishes a transport capability, not the existence, units or reliability of any aircraft-specific EFOB variable. PMDG ClientData and third-party display integrations likewise do not prove fuel-prediction access.

**Open technical questions:** For each aircraft, identify whether its own FMS destination EFOB is exposed numerically, its exact field/API, type, native units, destination association and validity semantics. Confirm independence from the selected CDU page, freshness, updates after route/altitude/performance changes, source provenance (actual FMS calculation versus another approximation), MSFS 2024 build/aircraft-version behaviour and whether access is documented/supported. Do not classify missing evidence as proven lack of support: use Unverified until evidence establishes Unsupported. Other M04 aircraft targets remain unassessed for this capability; this table does not remove them.

**Integration principles:** Prefer passive, read-only access to the aircraft's own calculation. SimConnect is preferred where feasible, with aircraft-specific interfaces permitted when necessary. Do not adopt screen parsing, OCR or CDU page manipulation as primary solutions. Keep aircraft/transport compatibility extensible without assuming every aircraft needs its own transport.

**Architectural proposal — not approved:** Shared SimConnect transport for standard SimVars, L:vars and ClientData, with aircraft-specific field adapters; an iFly shared-memory transport and optional Fenix GraphQL transport where justified. Fenix-through-SimConnect remains a candidate, not demonstrated EFOB access. A possible `FuelPredictionProvider` would report aircraft identity, destination ICAO, numerical destination EFOB normalised to kilograms, observation timestamp, source, validity and availability. Retain native unit meaning during validation; zero must not silently mean unavailable. The proposed common unit/interface and transport selection are not accepted architecture and do not change M09's MVP planning-unit rules.

**Deferred investigation spikes, before implementing C05:**

1. Inspect each candidate SDK/header, documented variable list, source or API schema; record exact numerical prediction fields, types, units and supported access. If no field is identified, record Unverified (or Unsupported only with evidence).
2. Validate candidate values against the aircraft's displayed destination EFOB in MSFS 2024 without changing the pilot's page. Observe route, altitude and performance changes, unloaded/uninitialised FMS, destination changes and stale/unavailable states. Record aircraft/simulator versions and repeatability. Observing current fuel alone cannot pass this check.
3. Only after a field is proven, evaluate the smallest read-only adapter/provider proof of concept, including unit conversion, destination association and loss-of-data handling. No application code or GitHub issues are authorised by this record. This is the first priority within the future EFOB workstream, not a new MVP development blocker.

Airport identification is a core reliability investigation. Evaluate position history around touchdown and taxi-in against available airport/runway facility data, including nearby airports, large airport layouts, add-on scenery differences and delayed or stale telemetry. Do not adopt a nearest-airport-centre rule without validating ambiguous cases. The intended outcome is reliable automatic identification by the arrival-dispatch decision where data permits, without requiring stand-level scenery/AFCAD detection. Define a representative validation set and measurable correctness, decision-latency and fallback-frequency criteria before declaring support; no numerical reliability claim or implementation method is established yet.

#### Airport facility discovery — documentation findings, 14 November 2026

**Parked point of interest / open question:** The product owner supplied a claim that a ground-contact-triggered Facilities API call can identify the occupied airport automatically. Retain this as a lead for later investigation, not a verified capability: the documented `SimConnect_RequestFacilityData` takes an ICAO as input, and `SIMCONNECT_DATA_FACILITY_AIRPORT` is an airport-list record rather than proof of occupancy. Whether another API or existing library provides reliable position-to-airport identification remains open under Section 7 question 14. Further airport-detection investigation is deferred at the product owner's request; no detection algorithm is approved.

**Verified documentation:** Facilities functions are part of SimConnect. The [2024 facility-subscription documentation](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simconnect/api-reference/facilities/simconnect_subscribetofacilities/) describes the reality bubble as approximately 200,000 metres (about 108 NM), not 200 NM, and distinguishes worldwide airport entries from locally cached navaids. [The EX1 subscription](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simconnect/api-reference/facilities/simconnect_subscribetofacilities_ex1/) limits airport results to the bubble and supplies entry/exit notifications. The [2020 non-EX1 list](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/Facilities/SimConnect_RequestFacilitesList.htm) and [EX1 subscription](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/Facilities/SimConnect_SubscribeToFacilities_EX1.htm) document the corresponding global/local distinction. Do not treat the approximate bubble size as an application guarantee or a hard-coded search radius.

The [2024 facility-data request](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simconnect/api-reference/facilities/simconnect_requestfacilitydata/) addresses an airport by ICAO. [Facility definitions](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simconnect/api-reference/facilities/simconnect_addtofacilitydefinition/) include runway centre coordinates, heading, length and width; [2020 facility definitions](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/Facilities/SimConnect_AddToFacilityDefinition.htm) are also available. These are data-retrieval capabilities, not a verified current-airport classification API. Runtime completeness, streaming/add-on effects and readiness outside the bubble still need testing.

**Recommendation — not an accepted algorithm:** Discover nearby airport candidates, retrieve only relevant airport/runway details and compare them with observed touchdown/ground position and recent track. Retain a confirmed arrival-airport identity through taxi-in instead of repeatedly selecting the nearest airport centre. Prefetch the planned destination's coordinates independently for M06: the 20-minute proximity trigger can qualify outside the local bubble. A local arrival-discovery cache must not accidentally limit that trigger. Keep the existing manual confirmation/automation hold for ambiguous cases; avoid a full scenery parser or whole-world database requirement unless evidence makes one necessary.

**Existing tools/frameworks to evaluate:** [Pomax's JavaScript SimConnect wrapper](https://github.com/Pomax/msfs-simconnect-api-wrapper/blob/main/README.md) documents all/nearby-airport queries and ICAO lookup with runway geometry. [Little Navmap](https://github.com/albar965/littlenavmap) is an application/source reference; its [MSFS 2024 FAQ](https://albar965.github.io/littlenavmap-faq.html) describes SimConnect scenery loading and limitations. Neither has been validated here as a reusable, reliable arrival-airport classifier. Assess stack fit, licence, maintenance and actual 2020/2024 behaviour before reuse; do not make Little Navmap a mandatory companion application.

**Focused airport-detection spike, before implementation of automatic arrival classification:** Compare local facility discovery and ICAO detail retrieval in both simulator versions; include destination queries outside the bubble, missing/multipart/delayed responses, a diversion, nearby airports, large airports and streamed/add-on scenery. Validate matching against known landing locations, persistence through taxi-in and recovery after missed touchdown observations. Measure correct/incorrect/unknown classification and time to decision before permitting automatic onward dispatch. Confirm whether the documented data is sufficient without introducing stand detection. This spike is proposed; no code or remote work items have been created.

For world-readiness detection, investigate the documented `Sim` system state and `SimStart`/`SimStop` events together with current user-aircraft telemetry. The SDK warns that start/stop events can repeat during loading/reset; a connection or single start event is not conclusive. Validate menu/loading/pause behaviour in both simulator versions. Sources: [system-state query](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/General/SimConnect_RequestSystemState.htm), [system-event semantics](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/Events_And_Data/SimConnect_SubscribeToSystemEvent.htm).

Where integrations use nonstandard variables, use developer-provided harnesses/emulators when available, or practical equivalents. Such testing supplements validation with the real aircraft. Keep scheduling and phase/state logic testable with recorded or synthetic telemetry without running MSFS.

OpenAP and other simulator/framework libraries are evaluation candidates only. DEC-046 accepts Electron/TypeScript/React and DEC-050 accepts high-level boundaries; this does not adopt OpenAP, a Python runtime or any additional adapter library. Assess live-data suitability, aircraft coverage, packaging and licence compatibility before adoption.

**Desktop stack candidates — initial discussion:** The product owner proposes either a full Electron application or Electron with a local Kotlin/Java Spring Boot backend, and has subsequently requested evaluation of Rust under the resource-efficiency constraint. These are retained as historical alternatives; Electron/TypeScript/React was subsequently accepted under DEC-046. A local backend process remains compatible with the no-proprietary-cloud principle. Compare domain-code maintainability, SimConnect coverage, runtime/startup cost, packaging and ownership of process lifecycle/state. Kotlin/Java selection and Spring Boot selection are separate choices; do not assume a JVM backend requires a web server or Spring.

**Accepted stack and boundaries — Electron / TypeScript / React (DEC-046/050):** Use TypeScript throughout with React presentation in an Electron-packaged Windows application. React displays backend state and submits commands. A small Electron main/preload layer owns window lifecycle, validated IPC, credential operations through safeStorage and utility-process supervision. A separate Node utility process hosts pure TypeScript domain modules and integration adapters; domain modules define ports and do not import Node, Electron or concrete adapters. Monitoring, scheduling, persistence and external requests belong in this backend. Persistence adapters execute there; credential operations cross the main-process boundary. Detailed IPC contracts, state coordination, storage format and recovery design remain PRE-09 work. node-simconnect remains the candidate transport requiring PRE-03 validation; iFly-specific native access remains conditional on demonstrated need. M17/AC16 resource budgets and measurements remain open under PRE-08. Stack acceptance is not evidence of runtime compatibility, performance or approval to begin implementation.

**Rust candidate review (14 November 2026):** Rust with a Tauri web presentation layer is a candidate for DEC-044/045: [Tauri's process model](https://v2.tauri.app/concept/process-model/) separates its native Rust core from WebView rendering. Domain/processing/integration modules can remain independent of Tauri commands and the UI; no Node/JVM runtime is needed if these functions are implemented in Rust. Windows WebView2 still incurs browser-process resource costs, so actual CPU, memory and frame-time impact remain to be measured. Using node-simconnect instead would require a Node component; that library does not execute directly in Rust or the browser frontend.

Rust integration candidates require capability validation, not selection by name alone. [FlyByWire msfs-rs](https://github.com/flybywiresim/msfs-rs) documents external SimConnect applications, and its [SimConnect source](https://github.com/flybywiresim/msfs-rs/blob/main/msfs/src/sim_connect.rs) contains typed ClientData registration/request paths. The inspected high-level API does not establish full newer facilities coverage; SDK/build/runtime version support, raw-binding extensions and aircraft binary layouts need investigation. The separate [mihai-dinculescu/simconnect-sdk-rs](https://github.com/mihai-dinculescu/simconnect-sdk-rs) repository is archived; its feature matrix leaves ClientData and newer facility-data methods unimplemented. [wegylexy/SimConnect's Rust branch](https://github.com/wegylexy/SimConnect/tree/rust) is another candidate implementing the protocol directly; its README reports newer facilities support but missing legacy facilities-list decoding. None has been built or live-tested here. A limited Rust binding to Microsoft's native SDK is an alternative to owning a wire-protocol implementation, with ABI, DLL deployment and SDK coverage still to validate.

For iFly, Microsoft's [windows Rust bindings expose OpenFileMappingW](https://microsoft.github.io/windows-docs-rs/doc/windows/Win32/System/Memory/fn.OpenFileMappingW.html); this supplies an access mechanism, not a ready-made aircraft adapter. Mapping/locking lifetimes, layout and unsafe FFI boundaries need careful handling. Rust's structs, methods, traits and enums support a separated domain model, but ownership/borrowing and lack of class inheritance introduce learning cost for a Java-oriented developer. This comparison is retained as earlier research, not an instruction to reopen framework selection. The subsequent accepted stack is Electron/TypeScript/React under DEC-046; Tauri/WebView is not the product owner's preferred presentation approach. Revisit alternatives only if validation reveals a material issue with the accepted stack. This earlier Rust review did not itself approve a dependency or establish runtime compatibility.

**Accepted separation and distribution requirement (DEC-044):** Domain logic, engines, processing and external requests belong in a backend clearly separated from presentation. The presentation layer submits user commands and displays backend state; operational rules must remain testable independently of the UI. Distribute AutoDispatch as a normal Windows application launched through its own executable. Installer versus portable packaging remains a technical design choice; a literal single-file executable has not been required. DEC-044 originally left stack and process choices open; DEC-046/050 subsequently select Electron/TypeScript/React with a separate backend utility process. Detailed IPC contracts remain design work.

**JVM SimConnect effort — preliminary evidence:** [Kotlin/JVM can call Java libraries](https://kotlinlang.org/docs/java-interop.html). jSimConnect's README explicitly warns that newer protocol features are missing. Its [SimConnect.java source](https://github.com/mharj/jsimconnect/blob/master/src/main/java/flightsim/simconnect/SimConnect.java) contains SimVar data definitions/requests, ClientData requests and basic facilities-list operations; a `requestFacilityData` method was not found in that inspected class. Method presence does not establish correct behaviour with either supported simulator or an aircraft SDK. Before selecting this route, assess required API coverage and propose a bounded live compatibility spike covering core telemetry, disconnect/reconnect, representative ClientData and any facilities operations the eventual airport design needs. Airport-detection design remains parked. Alternatives to evaluate if coverage is insufficient are a limited native binding (for example, [JNA](https://github.com/java-native-access/jna)), a small C# integration helper, or a C# backend using Microsoft's managed wrapper. These are recommendations, not approved components. Native mappings or helper-process communication introduce their own implementation and maintenance work; no effort estimate or working JVM integration has been established.

**Delegated jSimConnect investigation (14 November 2026):** A Claude Sonnet source review reports generic SimVar subscriptions, system events, ClientData and legacy facilities-list APIs present, with `requestFacilityData`, `addToFacilityDefinition` and `subscribeToFacilitiesEx1` absent. It reports no automatic MSFS named-pipe discovery or built-in reconnection; application connection management and resubscription are separate from extending the wire protocol. The coordinator verified [repository HEAD cce2a4a3ce07b14c9cc9051715ef449ac1f03be1](https://github.com/mharj/jsimconnect/commit/cce2a4a3ce07b14c9cc9051715ef449ac1f03be1), dated 18 March 2021, and the source's restriction to client protocol values `0x2`, `0x3`, `0x4`. This restriction does not establish MSFS 2024 incompatibility; no live simulator compatibility was tested. Sparse observed maintenance increases the risk of owning extensions, but does not prove abandonment. No production-effort estimate is accepted. Changes to protocol validation alone do not establish a working newer protocol. Required airport-detection capabilities remain an MVP feasibility question despite discussion being parked. If the JVM alternative is revisited, validate required capabilities before adopting its transport. The later DEC-046 selects TypeScript; this historical investigation does not adopt jSimConnect.

**node-simconnect comparison (14 November 2026):** Reviewed documentation and selected source at [2fca2ee3486e2e5972c2ecc3fe18592955e2c3fb](https://github.com/EvenAR/node-simconnect/tree/2fca2ee3486e2e5972c2ecc3fe18592955e2c3fb); latest GitHub release observed is v4.2.1, published 3 October 2026. This is a community TypeScript wire-protocol implementation, not Microsoft's SDK or a native DLL binding. The [API reference](https://evenar.github.io/node-simconnect/classes/SimConnectConnection.html) includes generic SimVar subscriptions, ClientData, `addToFacilityDefinition`, `requestFacilityData` and `subscribeToFacilitiesEx1`. Source includes KittyHawk/SunRise protocol options, named-pipe discovery, a facilities-detail sample and a reconnect sample. Reconnection/resubscription policy remains application work; binary payloads require explicit decoding. The [project documentation](https://evenar.github.io/node-simconnect/) states FSX_SP2 is compatible with MSFS 2020/2024 for older features; this reduces the concern about jSimConnect's protocol-number restriction but does not validate that client's implementation. Source/docs coverage is stronger than the inspected JVM candidate, with no AutoDispatch live validation yet. Recommend evaluating Electron with a separate TypeScript/Node backend process; [Electron utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process) supports this separation. That source review did not itself select the stack; DEC-046/050 subsequently accepted the stack and process boundaries. Aircraft-specific transports, EFOB availability and airport identification remain separate questions; this library alone does not resolve them. Package metadata declares LGPL-3.0-or-later; packaging/licence compatibility remains to be assessed before adoption.

The [node-simconnect project](https://github.com/EvenAR/node-simconnect) documents a TypeScript implementation of the SimConnect protocol over TCP/named pipes, with MSFS 2020/2024 support and no native SDK dependency for that transport. The source review above establishes candidate API coverage; aircraft-specific binary decoding, production reconnection, licensing/deployment suitability and live compatibility still require evaluation. This is not verified AutoDispatch compatibility or proof that all future aircraft interfaces can avoid native code. [Electron utility processes](https://www.electronjs.org/docs/latest/tutorial/process-model) offer a Node environment for isolating background work, without requiring a JVM service. [jSimConnect](https://github.com/mharj/jsimconnect) is a JVM candidate whose README documents MSFS 2020 named-pipe connectivity; the source review above establishes generic ClientData and legacy facilities methods, with newer facility-data methods absent and live 2024 compatibility still unverified. Retain [Microsoft's managed SimConnect wrapper](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/Programming_SimConnect_Clients_using_Managed_Code.htm) as the official .NET comparison point. The stack and high-level process boundaries are now accepted under DEC-046/050; no application implementation has started.

**Advance-planning trigger evidence (13 November 2026):** SimConnect documents `GPS ETA` and `GPS ETE`, but their correspondence to each add-on's destination/FMS remains unverified ([SDK variables](https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Aircraft_SimVars/Aircraft_RadioNavigation_Variables.htm)). UKCP offers a relevant precedent: its [public arrival-allocation source](https://github.com/VATSIM-UK/uk-controller-api/blob/2f1f1dab9fcb8f7f05560bcc1c4dfdafec1e0414/app/Services/Stand/ArrivalAllocationService.php) uses great-circle distance divided by current groundspeed, multiplied by 60, with a threshold below 15 minutes. Its [repository guide](https://github.com/VATSIM-UK/uk-controller-api/blob/2f1f1dab9fcb8f7f05560bcc1c4dfdafec1e0414/docs/guides/StandAllocation.md) says 20 minutes; the [pilot-facing guide](https://www.vatsim.uk/pilots/stand-guide) says approximately 15. The source revision is evidence of the published algorithm, not verification of the deployed service. The product owner accepted the same form of calculation solely as a local pre-dispatch trigger, with our own configurable default of 20 minutes (M06, DEC-018). This does not adopt UKCP's service, stand-allocation logic or exact threshold, and does not establish an accurate ETA.

### D03 — Hoppie ACARS

External aircraft messaging depends on:

- Valid user-provided Hoppie credentials.
- Network availability.
- Supported message formats and addressing.
- Behaviour of compatible aircraft and their ACARS implementations.

Internal message management must continue to function when Hoppie is unavailable.

The aircraft must have its own configured Hoppie-compatible client. Aircraft-specific monitoring adapters do not extend to direct ACARS delivery.

**Delivery semantics checked 14 November 2026:** The [official API documentation](https://www.hoppie.nl/acars/system/tech.html) describes server-side storage followed by recipient polling. It permits clients to repeat send requests after a delay, but does not document a dedicated retry operation or sender-facing cockpit-delivery/read receipt for ordinary telex messages. M09 allows retries of failed submissions, stopping at positive server acceptance. Server acceptance is not confirmation of cockpit display. Hoppie's storage/polling can delay retrieval after acceptance; the application must not resend to compensate for that delay. Validate response semantics and distinguish known submission failure from unknown acceptance after a lost response.

**Sender identity investigation (updated 15 November 2026):** [Hoppie's API specification](https://www.hoppie.nl/acars/system/tech.html) documents callsign locking across logon codes within a network after every connection except peek/ping, with a 100-second expiry renewed by qualifying activity. This documented scope includes TELEX sending; live enforcement has not been independently tested. DEC-055 replaces the shared AutoDispatch sender with preferred AD<current inbound ATC callsign>, balancing cockpit recognition against residual same-callsign collisions. Sender format and aircraft display compatibility remain unverified. Explicit conflict rejections permit bounded delayed retries; acceptance ends retries and ambiguous outcomes must not cause blind resubmission. Timing/limits and representative validation remain PRE-06 work.

**Additional evidence:** [Vaeroly's own dispatch documentation](https://vaeroly.com/help/dispatch-on-hoppie) explicitly describes using a staff member's personal Hoppie logon code to send telex from the airline's ICAO code plus OPS (for example WZZOPS). This supports the proposed naming convention's practical use, but does not demonstrate simultaneous use by different codes or explain any lock handling. Distinguish freely choosing a sender name, establishing a CPDLC session, and server-side callsign locking; these are separate questions. A telex request still carries sender and recipient identifiers through the common API.

**User-performed cockpit check, 17 November 2026:** The user reports sending a TELEX from `ADTESTEZY93ZW` to `EZY93ZW` using the API and receiving response `ok`. Their screenshot shows the complete sender and test message in the aircraft's AOC display. The user identifies the aircraft as Fenix A320 V3 build 3.0.0.7582 on MSFS 2024 SU7 build 1.9.24.0, main release (non-experimental); versions and server response are user-reported. This is evidence of receipt and readable display for this specific test. The exact preferred sender `ADEZY93ZW`, sender limits, conflicts and retries remain unverified. See [Hoppie discovery](docs/architecture/hoppie-discovery.md). PRE-06 remains open.

**Retry direction, 17 November 2026:** The user specifies up to three retries after the initial attempt, beginning at 30 seconds with backoff, except explicit callsign conflicts which wait 100 seconds between attempts. The multiplier, expiry, cancellation and restart details remain design work. This does not permit blind retry of a timeout or lost response; lock renewal can prevent a 100-second wait from resolving a conflict. See [Hoppie discovery](docs/architecture/hoppie-discovery.md); DEC-055 and PRE-06 remain in force.

### D04 — Airport Timezones

Airport-local time display requires reliable mapping between airports and their applicable timezones, including historical or future daylight-saving transitions relevant to the scheduled flight date.

---

## 7. Open Questions

This register retains both outstanding questions and recorded answers so existing references remain valid. Do not treat entries explicitly marked resolved as pending product decisions. The pre-implementation checklist below groups the remaining work by action and evidence needed.

| Current status | Question numbers | Treatment |
|---|---|---|
| Outstanding MVP integration, detection or architecture work | 1–5, 10–15, 17, 20–23 | Investigate the unresolved parts; retain the accepted behaviour already stated in each entry. Airport identification (14) remains parked, not resolved. |
| Preferred capability with accepted MVP fallback | 8 | Investigate personal saved-airframe listing; the accepted catalogue/manual setup alternative permits MVP without it. |
| Product behaviour resolved | 6, 7, 9, 16, 18, 19 | Preserve the answers and apply them in design and validation. Remaining implementation details do not reopen the product decisions. |
| Deferred future capability | 24 | Numerical aircraft FMS EFOB access belongs to C05 and does not block MVP. |

1. **SimBrief preview/regeneration — still open:** Can preview calculations return preliminary information without saving an OFP or changing the latest plan? Legacy `static_id` correlation is documented, but does not establish preview or duplicate-free API regeneration. Confirm the approved newer workflow under D01/PRE-01; preserve DEC-059's separately accepted duplicate risk during uncertain-failure retries.
2. **Automated dispatch — partially answered:** Navigraph documents desktop Device Authorization Flow with PKCE, user access/refresh tokens and an SDK auth module; staff identify the application/use-description route to obtain credentials and SimBrief endpoint guidance. Still confirm AutoDispatch approval, permitted unattended generation, API version/endpoints, scopes, client credential distribution and SDK suitability. Public V2 threads are supporting evidence, not our granted permissions. See D01 and the linked findings.
3. **Passenger limits — partially answered:** Legacy `acdata.maxpax` is documented, with staff confirmation of a historical ignored-value fix. The existence of a maximum-capacity input is answered. Validate current/V2 behaviour when explicit passengers exceed capacity, saved-airframe precedence, returned fields and units; retain M08 returned-value validation and user notification rather than silently rewriting the OFP. See D01/PRE-02.
4. **OFP generation lifecycle — partially answered:** Legacy documentation supports retrieving a particular plan through `static_id` after website edits/regeneration; sample generation returns an `ofp_id` used to retrieve its result. Confirm V2 correlation and repeat-submission semantics rather than assuming idempotency or in-place API editing. Cancellation, async status/results, provider limits and applicable retry timing remain open under PRE-02; DEC-059 fixes the application attempt budget and accepts possible duplicates after uncertain failures.
5. **Hoppie response handling:** Map positive submission acceptance and request-boundary failures. Confirmed rejections may be retried; once accepted, never retry for delivery/read confirmation. Define bounded retry limits/timing and verify response classification. Ambiguous timeouts/lost responses must not trigger blind resubmission (DEC-059). The in-app ACARS log remains the fallback. Validate message-format and aircraft-client compatibility without equating server acceptance with cockpit display.
6. **Flight status calculation — resolved:** Departure/off-block and arrival/on-block comparisons and timing statuses are separate under M05/M11. Planning times come from the filed OFP; actual event times come from simulator UTC. Do not generate real-time arrival ETAs. Missing inputs remain unknown. No aggregate priority rule is required.
7. **Manual event-time editing — resolved for MVP:** Exclude manual entry/correction of actual off-block, takeoff, landing and on-block timestamps. Observed simulator-time actuals are retained; missing times remain unknown. Agreed RTO, airport-confirmation and rotation-recovery controls remain supported.
8. **Saved-airframe selection — fallback documented; personal listing open:** Selection from the authenticated user's saved airframes remains preferred if supported. Public aircraft/layout and detailed airframe catalogue endpoints were successfully read on 18 November 2026, and the legacy API documents an optional single Internal ID. Retain the M02 catalogue/manual/optional-ID fallback without bulk ID entry. Personal authenticated GET/list access, V2 permissions, fields and generation semantics remain unconfirmed; see D01 and the linked findings.
9. **Final-leg recovery and automatic clearing — resolved:** New Rotation requires confirmation before replacement. Normal final-leg stationary/full-shutdown completion clears automatically. A final-leg return/diversion instead prompts for recovery or explicit Finish and clear rotation confirmation; until answered, retain the rotation. Clearing removes rotation-specific local history/associations/messages while preserving settings, credentials and airline/turnaround profiles; SimBrief data is unaffected.
10. **Airport timezones:** Which source will provide reliable ICAO-to-timezone mapping?
11. **Departure detection:** Which reliable combination of ground movement, lights, brake and engine signals recognises both engine-off pushback and self-manoeuvring stands? Resolve the discussed approximately 3 kt threshold through testing. Door checks and pushback-specific signals are excluded under DEC-041; wider aircraft-specific variable research is deferred to the later compatibility pass.
12. **Phase classification:** How should descent reference actual operating altitude, including ATC-assigned levels and step changes? Evaluate OpenAP versus explicit rules and optional selected-altitude evidence without assuming any library is selected. Define confirmation periods, low-cruise behaviour and missed-phase recovery.
13. **Go-arounds and landing:** Define airborne/ground confirmation and go-around re-entry rules. Return-to-departure landing recognition is accepted under M16 and no longer requires an airport different from departure.
14. **Airport identity and recovery flights:** Validate robust automatic airport identification and define measurable reliability criteria under D02. Unknown/ambiguous arrival identity holds automatic onward dispatch and activation pending manual airport confirmation; this is an exceptional fallback. Confirmed returns/diversions immediately suspend automatic onward dispatch and activation; present recovery choices at stationary/full shutdown. Re-dispatch creates a new leg with a fresh OFP and preserves the original attempt. Repositioning defaults to the actual diversion airport → original planned destination, with the destination editable before generation. Alternatively, users may skip recovery and manually reposition for the next scheduled leg; explicit Resume next leg confirmation is required before monitoring/automation resumes. Verify available updated weather/runway inputs through the SimBrief integration.
15. **OFP timing mapping and telemetry validation:** MVP displayed planning times come from the filed OFP; verify the available fields and whether they represent landing or on-block events. Real-time arrival-ETA prediction is deferred to S08 and does not block MVP. The distance/current-groundspeed trigger, configurable 20-minute default and immediate short-sector qualification independent of phase sequence are accepted in M06. Validate airborne confirmation and telemetry quality without introducing a phase-sequence or altitude prerequisite for pre-dispatch.
16. **Timing-gap recovery — resolved for MVP:** Use the configured taxi-in fallback where needed. Valid on-ground, stationary, all-engines-stopped completion after flight establishes gate arrival and continues the existing next-leg workflow even if touchdown was missed or taxi-in exceeded its estimate. Do not invent missing actuals or add special predictive recovery. Existing activation timing, turnaround and recovery holds remain in force. DEC-049; M05/M16.
17. **First-leg startup validation:** Start Rotation initiates first-leg OFP generation, and the rotation commences only when SimBrief returns that flight plan successfully, subject to M16 readiness checks. Pre-departure edits/regeneration remain available under existing locks. Validate the optional departure-airport check and behaviour on a known mismatch, and verify API response association. Special recovery for readiness lost during first-OFP generation is excluded from MVP under DEC-048 (YAGNI); do not reopen it as a startup requirement. No late attachment is introduced.
18. **Schedule baselines — resolved:** Scheduled, Filed and Actual are distinct. Scheduled comes from manual input or the first available OFP-filed value; regeneration updates Filed only. Explicit pre-departure schedule edits may change Scheduled under the existing locks. Persistently display Scheduled versus Actual, with Scheduled versus Filed on hover. Actuals remain simulator-observed and non-editable in MVP.
19. **Recovery and skips — product behaviour resolved:** The single current working rotation persists, including pending legs, active-leg progress, completed history and associated messages. Temporary SimConnect reconnection and application restart automatically resume a previously active leg from valid current observations and permit skipped phases. Skipping an unflown leg always requires explicit user intervention through a skip/recovery control or removal in the rotation editor; never automate it. Retain departure locks, continuity validation and explicit resume after manual repositioning. No special recovery for manual simulator-clock changes; unobserved timestamps remain unknown. Persistence/adapter implementation and UI placement remain design work. DEC-047.
20. **Technology selection resolved; validation and detailed design open:** Electron + TypeScript backend + React presentation is accepted under DEC-046; DEC-050 accepts pure domain modules, integration adapters and the utility-process/main/renderer boundaries. Verify required SimConnect coverage and M17/AC16 resource budgets under PRE-03/PRE-08. Define detailed IPC contracts, recovery and necessary native adapters under PRE-09. Keep researched alternatives for material validation failures rather than reopening an unbounded framework survey. node-simconnect API coverage alone does not establish packaged-app suitability; installer size is not evidence of runtime memory or simulator impact. Validate OpenAP latency and packaging only if retained as a candidate.
21. **Generation concurrency and uncertain outcomes — product policy resolved; adapter validation open:** DEC-058 permits eligible edits during subsequent asynchronous generation with stale-response rejection. DEC-059 permits initial-plus-three retries for no usable OFP, including uncertain outcomes, and accepts possible duplicate remote plans. Manual Retry starts a fresh cycle. Verify association, usable-response validation, timing/backoff and provider limits under PRE-02. Cancellation is not assumed. First startup remains OFP-gated; Hoppie retains conservative no-blind-resubmission rules.

22. **Preliminary fuel data sources:** Verify fuel-burn, estimated arrival-fuel and alternate-fuel data available from the current leg's OFP or directly through supported Navigraph/SimBrief API endpoints. Confirm field availability, units, event basis and association with the relevant flight plan; no specific endpoint is assumed to exist. Define how to account for diversion to the planned alternate without double-counting its burn, and how to identify unavailable/non-applicable figures for an unplanned diversion. No live gate-fuel prediction or actual uplift calculation is required. FMC/SDK predictions and engine-start fuel adjustments are deferred under C05. Existing diversion holds and the single automatic-message rule still apply.

23. **Hoppie sender compatibility:** DEC-055 selects AD<current inbound ATC callsign> (for example, ADEZY1871), subject to validation. Establish allowed sender length/characters and readable display in representative aircraft clients; do not silently truncate an unsupported value. Validate explicit callsign-conflict handling against authoritative evidence or a separately authorised controlled test. Agree bounded retry delay/backoff, attempt limits and expiry/cancellation rules, preserving the original message and identities. Same-flight collisions remain an accepted residual risk. The documented lock scope includes sending; the former shared-AutoDispatch naming proposal is superseded, not an outstanding product choice.

24. **Future numerical FMS EFOB access (C05, not an MVP blocker):** No aircraft has validated extraction. Follow D02's field-identification and passive live-validation spikes before implementing aircraft fuel-prediction providers. Keep the proposed shared transports/provider abstraction unapproved until data access and architecture are agreed.

These questions should remain explicit rather than being silently resolved through assumptions in UI mockups or implementation. Separate MVP-critical questions from deferred future-capability investigations.

### Pre-implementation action checklist

This is the quick reference for work needed to establish the development baseline. **Read each item's status:** stack selection and high-level boundaries are accepted, while validation and detailed design remain outstanding; completed documentation/source research is supporting evidence, not a substitute for the stated completion criteria. The actions and sequencing are proposed discovery work, not implementation tickets or authorisation to run code, change simulator configuration, contact vendors or create remote resources. Update each status here as evidence is obtained; retain the existing requirement and decision identifiers.

| ID | Status | Action before the development baseline | Evidence needed to close / dependencies |
|---|---|---|---|
| PRE-01 | Open — authentication/access route documented; generation permission pending | Confirm AutoDispatch approval and supported unattended OFP generation; resolve preview versus same-plan regeneration. | Apply documented desktop PKCE authentication and the staff-provided access route; confirm actual client/scopes and generation contract rather than inferring them from the SDK or V2 forum reports. Unattended generation remains a viability gate; preview limitations require an explicitly agreed alternative. D01; questions 1, 2, 4; [evidence](docs/architecture/simbrief-discovery.md). |
| PRE-02 | Open — legacy fields/correlation documented; approved contract pending | Map the approved SimBrief planning-data contract and generation lifecycle. | Carry forward documented legacy static_id, maxpax, input units and catalogue fallback as evidence, not assumed V2 parity. Representative supported responses must establish association, scheduled/filed events, taxi-in, fuel/alternate accounting, passenger enforcement and missing values. Validate DEC-058/059 response revision checks, bounded retries/provider limits and usable-result handling. Include optional-ID/catalogue fallback and timezone source if retained. Questions 3, 8, 10, 15–17, 21, 22; [evidence](docs/architecture/simbrief-discovery.md). |
| PRE-03 | Open — source research complete; live validation pending | Validate node-simconnect against the representative MSFS 2020/2024 integration needs. | A separately authorised bounded spike demonstrates connection, required standard telemetry, simulator UTC date/time, readiness, disconnect/reconnect and resubscription, plus representative PMDG ClientData/L:vars where required. Record actual SDK/library/simulator versions, gaps and mitigation. Assess whether a necessary iFly field requires a native binding/helper. D02, M04, DEC-041/043. |
| PRE-04 | Open — detection details remain; product gaps closed | Finalise and validate the remaining detection rules. | Agree testable departure cues including engine-off pushback, descent/phase confirmation, phase skipping and bounce/go-around rules. Manual-only leg skipping and shutdown-based timing-gap recovery are resolved under DEC-047/049; special first-OFP readiness-loss handling is excluded under DEC-048. Apply these decisions in transition examples rather than reopening them. M04–M06, M16; questions 11–13 and the remaining validation aspects of 17/21. |
| PRE-05 | Parked — unresolved MVP dependency | Resume airport-identification feasibility investigation when scheduled. | Establish an evidence-backed candidate approach, representative validation cases and agreed correctness/latency/fallback criteria. Demonstrate sufficient feasibility for ordinary arrivals, returns and diversions before relying on automatic onward dispatch. No nearest-centre or Facilities API occupancy assumption. D02; question 14; AC15. |
| PRE-06 | Open — protocol/sender verification pending | Validate AD<current inbound ATC callsign> sender compatibility and bounded conflict retries (DEC-055). | Establish permitted sender length/characters and validate the preferred sender and conflict handling. A user-performed Fenix cockpit receipt is recorded in D03; broader compatibility and live lock enforcement remain unverified. Define remaining retry backoff, expiry/cancellation and restart details. Preserve original message identities, stop at positive acceptance and do not blindly retry ambiguous outcomes. Hoppie remains optional with the in-app log fallback. D03; questions 5, 23. |
| PRE-07 | Selection accepted — validation outstanding | Apply DEC-046/050 and assess the selected stack against integration and resource evidence. | Electron/TypeScript/React and backend/presentation boundaries are accepted. PRE-03 and PRE-08 still need representative compatibility and resource results; identify required native adapters and return any material failure for an explicit decision. Stack acceptance does not close those validation gates. Question 20. |
| PRE-08 | Open — budgets and measurements pending | Define and assess the accepted stack's resource budget alongside MSFS. | Agree representative hardware/scenarios and CPU, total-process memory, GPU/I/O and frame-time criteria. A separately authorised release-packaged representative spike measures visible/minimised monitoring, startup/peaks and sustained operation; a blank window or installer size alone is insufficient evidence. Full-product regression validation continues during implementation/release. M17, AC16, DEC-045. |
| PRE-09 | Partially resolved — detailed design and validation open | Complete the technical design and testing approach within DEC-050. | High-level domain/integration ownership and process boundaries are accepted. Apply DEC-056–060 and the remaining DEC-051–054 rules. Named internal IPC endpoints, shared request/response definitions, runtime validation, backend-owned snapshots and transactional saves are agreed (DEC-062 amends the earlier enum requirement). The data model and docs/architecture/ipc-contract.md specify local field/payload contracts, credential boundaries and bounded diagnostics; executable validators, writer/reload proof and verified provider authentication remain pending. Do not introduce a general version-history or backend restart/health-check framework. Define domain tests without MSFS, synthetic/recorded telemetry and representative live checks. Validate normal restart/process termination in the early-development prototype under DEC-061, outside #20 closure. Broader OS-crash/power-loss guarantees remain undecided and must be agreed before expanding tests or storage machinery. Confirm dependency/SDK licence and deployment constraints. DEC-044/050, M14–M17, D01–D03. |
| PRE-10 | Open — baseline review | Review the refined MVP and prepare a practical development plan. | Product owner agrees PRD scope, accepted architecture and remaining explicitly deferred risks. Prepare repository/build/test conventions, Windows packaging/release approach, milestones and a bounded initial backlog with prerequisites and acceptance criteria. Review proposed GitHub organisation before any separately approved remote creation. Depends on closing or explicitly resolving the preceding baseline gates. |

**Suggested order:** Pursue PRE-01 first as the viability dependency. PRE-03/PRE-08 and PRE-06 can be investigated independently while external answers are pending. Resolve PRE-04/PRE-05 and the planning contract before the detailed design baseline; complete PRE-07 validation and PRE-09 before PRE-10. The accepted stack and high-level boundaries need not be reopened absent material new evidence. A parked item is not completed or automatically deferred out of MVP.

**Not required to close before initial implementation:** Numerical FMS EFOB/tankering work (C05), real-time ETA (S08), automatic whole-rotation scheduling/downstream delay propagation (S06/S07), and personal saved-airframe listing when the accepted catalogue/manual fallback is used. Exhaustive testing of every aircraft/version and full-product resource/recovery hardening belong in implementation/release validation; representative feasibility and an explicit compatibility test plan are required at this stage. Do not promote an aircraft to supported solely because its SDK exists.

---

## 8. MVP Acceptance Criteria

The MVP is considered functionally ready when the following workflows are demonstrated.

**AC01 — Rotation creation**

A user can create or import a multi-leg rotation, configure its aircraft, validate airport continuity and recover the working rotation after restarting the application.

Creation and import do not require scheduled times for every later leg. Missing timing is explicit and does not create fabricated delay values.

With an existing rotation, New Rotation requires confirmation before replacement; cancelling preserves it. On normal final-leg completion at stationary/full shutdown, automatically clear the live rotation and its local legs/history/OFP associations/application messages. Earlier-leg completion, touchdown and the low-speed dispatch trigger must not clear it. Preserve settings, credentials and airline/turnaround profiles, make no SimBrief deletion request and verify that restart does not restore the cleared rotation. For final-leg returns/diversions, verify that the rotation remains until the user adds the applicable recovery leg or explicitly confirms Finish and clear rotation. Dismissing or leaving the prompt unanswered must not clear it; a recovery leg extends the current rotation.

Allow aircraft/variant selection from the general SimBrief catalogue and manual configuration without a saved-airframe ID. Present the variants actually provided by the catalogue rather than requiring users to type their identifiers. Alternatively, allow one optional SimBrief airframe Internal ID for the rotation's aircraft setup and use it according to the supported generation API. Do not require bulk ID entry/import. If personal saved-airframe listing is verified and implemented, allow selection of the authenticated user's saved profiles; do not present generic catalogue entries as their personal saved profiles.

**AC02 — Lifecycle protection**

Exercise eligible edits/removal/reordering during subsequent generation: invalidate affected revisions/context atomically, preserve continuity and holds, and disregard obsolete callbacks. Startup overlay still blocks edits. Remove a pending leg and restart: retain original ACARS messages with frozen context, without a hidden leg or full request/result history. No stale callback may recreate or dispatch it. DEC-057/058 replace DEC-052 request-order locks.

Verify that skipping an unflown leg occurs only after an explicit user action through the chosen skip/removal UI. Elapsed schedule time, missing telemetry and generation failure must not skip it automatically. Preserve departure/completed-leg locks and airport-continuity validation; apply explicit-resume protection where manual repositioning is needed. Do not fabricate completed-flight actuals for the omitted leg.

Verify future legs remain editable during flight and subsequent generation. Current-leg edits require grounded/stationary/engines-off telemetry. Engine start and taxi-out close editing. A return to gate before established airborne flight reopens it, including after RTO, preserving original off-block. Edits invalidate the OFP and require explicit regeneration; airport changes invalidate downstream preparation from the earliest eligible leg. Once airborne or completed, planning stays locked. Actual timestamps remain unknown when missed and cannot be edited. DEC-058.

**AC03 — Live monitoring**

The application identifies an active flight, tracks supported flight phases and records relevant actual timings through SimConnect.

Disconnect during departure before TAKEOFF is observed, then restore valid telemetry showing the aircraft airborne above 1,500 ft AGL in CLIMB. Verify that the same leg resumes directly in CLIMB without waiting for TAKEOFF or requiring user confirmation, and that planning is locked. During the gap, stale telemetry must not drive actions. Preserve recorded history, leave missed takeoff time unknown, retain any explicit recovery suspension and do not duplicate successful dispatch actions after reconnecting.

Demonstrate the agreed phase thresholds, DEPARTING without a separate TAXI-OUT phase, recovery when TAKEOFF is missed, and the TAKEOFF-only manual RTO action. Validate supported aircraft/simulator combinations explicitly. Tests include bounce/go-around protection, engine-off pushback and stale telemetry; unresolved detection details must be settled before claiming this criterion passes.

**AC04 — Next-leg readiness and available delays**

For a previously flown inbound leg with a missed touchdown timestamp or an exceeded taxi-in estimate, demonstrate that valid on-ground, stationary, all-engines-stopped detection records gate arrival and continues the existing completion/handover workflow. Keep missing touchdown unknown, omit further taxi-in from readiness, and preserve the activation timer/early-departure exception and recovery holds. The initial parked state of a fresh leg must not satisfy this completion case.

Show off-block and on-block timing separately, each persistently displaying Scheduled versus Actual. Hovering over its time shows labelled Scheduled versus Filed values. For Scheduled 13:00, regenerated Filed 13:20 and observed Actual 13:23, retain all three values and show actual departure deviation of +23 minutes; regeneration must not reset the baseline to 13:20. Verify that an explicit permitted pre-departure schedule edit can update Scheduled and that restart preserves the three separate values. Before the event, Actual remains unknown rather than displaying Filed in its place. A departure 20 minutes late can coexist with arrival on time. Position, speed and flight-progress changes must not recalculate Filed. Missing comparison inputs yield unknown deviation/status for that event without suppressing a valid comparison for the other event.

Use OFP-filed timing as the pre-arrival readiness reference, then actual landing plus the planned taxi-in allowance, then actual gate arrival as the relevant events become available under M05. This is turnaround scheduling, not a live airborne ETA engine. Where a scheduled departure exists, estimated next-leg departure cannot precede it. Where a future scheduled departure was manually entered, show the resulting readiness-based departure delay. Each leg independently reports actual arrival deviation against its retained scheduled arrival on the same event basis. No scheduled baseline means no early/late classification. Full timetable generation and propagation remain S06/S07.

Turnaround is anchored to estimated gate arrival until the stationary/all-engines-stopped arrival proxy is observed, then to that recorded time. Verify that touchdown and the primary ≤30 kt dispatch trigger do not start turnaround or add taxi-in twice. Arrival delay uses gate/on-block arrival, with touchdown preserved separately.

**AC05 — Dispatch sequencing**

Among pending flights, only the first is eligible for manual OFP generation. Start Rotation requests the initial leg's OFP; detecting a ready aircraft must not generate it automatically. Verify that a pending request or initial acknowledgement leaves the rotation unstarted and its first leg Pending. Successful return of the matching OFP enables commencement and first-leg activation under the startup conditions; definitive failure must not start it. Pre-departure regeneration remains available under existing locks, as does initial generation for an eligible subsequent leg without an OFP. Airborne/completed legs cannot initiate ordinary dispatch for themselves; a pre-flight return to gate may reopen generation under M01. Automatic generation for subsequent eligible legs obeys the configured triggers and sequencing restrictions.

With an airborne aircraft and no previously active monitored leg, permit future schedule preparation but block operational OFP dispatch and new active-leg attachment. Do not adopt the current simulator flight or offer an attachment action. Separately verify that airborne advance preparation for an already monitored rotation and reconnection recovery of its active leg continue to work under their existing rules. Final operational OFP dispatch requires confirmed ground state.

Distinguish advance planning from final OFP generation. Demonstrate the on-ground ≤30 kt primary trigger and stationary/all-engines-stopped fallback, including a retry when no primary OFP was produced and no automatic second OFP after a successful primary result. The inbound remains Active until stationary/shutdown completion. Disabled automation and manual generation are also exercised. The supported preview/edit workflow and bounded retry mechanics must be verified; uncertain SimBrief outcomes follow DEC-059.

Advance planning uses the dedicated proximity trigger specified in M06 and AC14, independently of any landing/gate ETA source.

Editing relevant planning inputs after generation marks the OFP Out of date without automatically sending another generation request. The eligible, unlocked leg offers Regenerate OFP. Successful regeneration matching those inputs restores current status; failure leaves the old OFP visibly outdated. Engine start/taxi-out closes editing; a pre-flight return to gate may reopen it under M01. Airborne/completed planning remains locked. Generation concurrency follows DEC-058/059; adapter mechanics remain under question 21.

Verify first generation blocks UI interaction while the backend remains responsive. Subsequent generation shows a toast/indicator and permits eligible edits. An edit/reset invalidates old results; a still-matching response arriving after departure attaches without resetting actuals. Exercise one initial attempt plus three retries for failure, timeout and corrupt/unusable OFP, stopping at first valid matching success. Exhaustion preserves inputs and offers manual Retry with a fresh budget. Restart preserves cycle accounting. Accept possible remote duplicate plans, never multiple local adoptions. First rotation cannot start without an OFP; later/recovery legs can be monitored with planning unavailable. DEC-058/059.

**AC06 — SimBrief authority**

Generated flight-plan values are obtained from SimBrief and are not replaced with fabricated planning data.

**AC07 — Internal ACARS continuity**

With active inbound callsign EZY123 and upcoming callsign EZY456, verify that the preliminary message is addressed to EZY123, identifies EZY456 in its body and is associated with the upcoming leg in the application. Selecting the upcoming leg for display or generating its plan must not substitute EZY456 as the inbound message's recipient.

Use ADEZY123 as the preferred sender for inbound EZY123 under DEC-055, subject to validated format constraints. Confirm sender and recipient remain frozen for the message even if the next leg activates before a retry. Validate supported lengths/characters and cockpit display under D03/question 23; unsupported values must not be silently truncated. Exercise explicit callsign-conflict rejection, bounded delayed retry and exhaustion with local-log continuity. Positive acceptance stops retries; ambiguous timeouts do not trigger blind resubmission. Retry direction and remaining design work are recorded in D03.

Messages remain available without Hoppie connectivity, and the application preserves message state and unread counts.

Generate a message with Hoppie unconfigured, with a definitive submission failure and with an uncertain timeout. In each case retain it in the in-app ACARS log and continue rotation operation. Verify that a request-boundary failure can be retried for the same message and that positive acceptance ends submission attempts. Missing cockpit acknowledgement, reconnection and restart must not resend an accepted message. A timeout must not be represented as proven rejection or acceptance; ambiguous outcomes must not trigger blind resubmission under DEC-059. Response classification remains subject to Section 7 question 5. Local read/unread changes must not imply cockpit reading or delivery acknowledgement.

For a rotation A → B → C, verify that no preliminary dispatch message is generated for A → B. During A → B, a valid proximity calculation at or below the configured threshold initiates one automatic preliminary message for B → C. Include a short flight already below the threshold at its first valid airborne observation. Subsequent estimate changes, threshold recrossings, final-OFP generation and reconnect/restart must not create another automatic preliminary message for B → C. Updated messages require an explicit user request outside the accepted-recovery reset in DEC-057; submission retries concern the same logical message and stop once Hoppie accepts it.

Verify preliminary message content under M09, distinguishing next-leg planned block fuel from the inbound planning-data-based estimated arrival fuel. Use the current leg's burn/arrival figures from either the OFP or supported Navigraph/SimBrief API data; do not require current onboard fuel, FMC predictions or actual engine-start fuel for the estimate. Demonstrate the verified alternate-fuel mapping for a confirmed diversion to the planned alternate, without deducting the allowance on a normal destination arrival or counting it twice. Preserve existing recovery holds and do not automatically issue a second message merely because the arrival outcome changes. Missing fuel-planning inputs leave the affected figure explicitly unavailable while other available information remains accessible. Do not calculate or display actual uplift or loading instructions. Keep units consistent and estimates visibly provisional; field semantics remain subject to Section 7 question 22.

External messages use Hoppie's network and an independently configured compatible aircraft client. Display delivery status only to the extent supported by returned evidence.

**AC08 — Connection awareness**

SimConnect and Navigraph states are visible throughout the application. Stale simulator data is not represented as live.

**AC09 — Local time display**

The Rotation board can show airport-local times alongside UTC without changing the underlying schedule or calculations.

**AC10 — Rotation consistency**

The same flight information, timing indicators and state semantics are maintained whether the selected-leg details drawer is open or closed.

**AC11 — Local persistence**

Validate normal restart and unexpected application/backend-process termination at the agreed save/action boundaries. Establish the required OS-crash/power-loss guarantee separately under PRE-09 before expanding the validation programme; application-termination results must not be represented as proof of those broader guarantees. This acceptance criterion remains unverified until the agreed scope is demonstrated (DEC-054).

The single current working rotation survives normal closure and unexpected application termination without requiring a proprietary cloud backend. Verify retention of pending legs, active-leg progress, completed history, OFP/dispatch associations and application-message history/read state. Restore the previously active leg automatically and resume from valid current telemetry, skipping missed phases without inventing timestamps, repeating locally known successful external actions or bypassing recovery holds. Uncertain SimBrief results follow DEC-059 with accepted remote-duplicate risk; Hoppie remains conservative. The remaining rotation stays available for onward dispatch. Preserve settings and secure credential handling under M15. Do not require multiple saved rotations, a saved-rotation library or reusable templates.

**AC11/AC13 additional state and IPC scenarios — DEC-060/062:**

- Apply recovery acceptance as one transaction: leg insertion/activation, preparation reset and hold release all commit together. Save failure leaves committed state unchanged, reports an error and sends no dependent request; no unsaved operational mode.
- Reads expose complete committed snapshots. Named internal endpoints accept command-specific request DTOs and return corresponding typed responses; formal command enums are not required. Endpoint selection determines the handler even when request shapes are identical. Duplicate delivery cannot repeat a committed action; reusing a command ID for a different endpoint is rejected even when the fields are identical. Validate malformed inputs, response correlation and obsolete responses. Backend unavailability produces an error, without adding an automatic restart/heartbeat framework.
- Unreadable working state is preserved, with a recovery error and a fresh-rotation option. Settings and credentials are separate. Save the fresh state before operation; never automatically restore the unreadable file or an older snapshot.
- JSON process-termination proof is deferred to the early-development prototype under DEC-061, with applicable authorisation; no design acceptance establishes writer reliability or power-loss guarantees.

**AC12 — Operational clock and leg handover**

After selecting Start Rotation, show the startup loading/status view while awaiting the first OFP. An acknowledgement alone must not clear the pending-start status. Successful OFP receipt completes startup under M16; definitive failure is displayed without activating the first leg.

Operational timers follow simulator time, and timestamps are stored as UTC independent of local display settings. The outbound becomes Active ten simulator minutes after inbound stationary/shutdown completion, or immediately Active/DEPARTING on an earlier qualifying departure, without duplicate activation, subject to the return/diversion suspension in M16. Accepted recovery is the immediate-activation exception under DEC-056. Network timing remains independent. No manual simulator-clock-change reconciliation workflow is required.

For a not-yet-started rotation, demonstrate that readiness alone does not activate its first leg. The user selects Start Rotation and the first leg becomes Active only after SimBrief returns its OFP successfully. Require confirmed in-world aircraft, live SimConnect connection, on-ground state, parking brake set and all propulsion engines off. Powered turnaround/APU states must not block eligibility. Menus/loading alone must not activate a leg, initial parking must not complete it, and reconnecting must not reset existing progress. Validate departure-airport matching if adopted. Activation follows AC02 parked/engines-off editing eligibility, including its pre-flight return-to-gate exception. Verify that automatic recovery of an already-started rotation and normal subsequent-leg handover do not require a new commencement action or repeat first-leg generation.

**AC13 — Testability and compatibility evidence**

Scheduling, timing and phase/state rules can be exercised without a running simulator using controlled telemetry/time inputs. Nonstandard aircraft integrations use available developer harnesses/emulators or practical equivalents where possible, with actual-aircraft checks before declaring support.

**AC14 — Pre-dispatch proximity trigger**

For an eligible airborne inbound flight with valid telemetry, calculate `(destination great-circle distance in NM / groundspeed in knots) × 60` and qualify when the result is **≤ the configured threshold** (default 20 minutes). At 300 kt, 120 NM yields 24 minutes and does not qualify; 100 NM yields 20 minutes and qualifies; 90 NM yields 18 minutes and qualifies. A short hop whose first valid airborne calculation is 15 minutes qualifies immediately against the 20-minute default without ever having observed a value of 20 minutes or higher. Changing the threshold changes qualification without requiring an FMS ETA or VATSIM connection.

Verify that ground state, zero/invalid/stale speed or invalid location data cannot trigger advance preparation, and that repeated threshold crossings do not repeat a successful preparation for the same next leg. A short flight already within the threshold qualifies as soon as airborne is confirmed and other eligibility/data conditions are met, including below 1,500 ft AGL and without an observed TAKEOFF, CLIMB or CRUISE phase. No prior outside-threshold sample is required. Missing or skipped displayed phases must not block the trigger. The proximity value must not populate landing/gate ETA, turnaround or delay calculations. The final-OFP arrival/shutdown triggers remain independent.

---

**AC15 — Returns, diversions and onward dispatch suspension**

Across the representative airport-identification validation set defined under D02, demonstrate automatic identification of ordinary destination arrivals, returns and diversions without routine user confirmation. Include nearby airports, large layouts, add-on scenery differences and delayed/stale telemetry. Record correctness, identification latency and manual-fallback frequency against the agreed criteria. An unresolved identity must hold onward generation and activation and offer manual airport confirmation, without falsely classifying a diversion or blocking inbound landing/completion recording. Once confirmed, apply the appropriate arrival outcome and recovery rules.

Demonstrate a confirmed landing after an established airborne state at the departure airport and at a diversion airport. Retain the planned destination and actual arrival separately. Complete the inbound only when stationary with all engines stopped. Neither the low-speed arrival trigger nor shutdown fallback may generate an onward OFP while recovery awaits user confirmation; neither the ten-minute timer nor early-departure detection may activate the next leg during that suspension.

Suspend onward automation when the unexpected arrival is confirmed, but show the recovery prompt only at stationary/full shutdown when the inbound completes. Offer re-dispatch after a return to departure and addition of a repositioning flight after a diversion. Also offer skipping recovery to continue with the next scheduled leg, explaining that the user must manually reposition to its departure airport. Selecting skip creates no recovery leg or OFP and preserves the original attempt's recorded outcome. An unanswered prompt must not create a recovery flight or resume automatic onward operations. Airport-identification ambiguity remains subject to Section 7 question 14.

After skip recovery, verify that simulator loading, relocation movement, elapsed handover time and detection at the expected airport do not automatically dispatch, activate or record departure for the next leg. Only explicit Resume next leg confirmation releases the recovery suspension, subject to normal telemetry and dispatch eligibility checks. Do not retrospectively treat relocation movement during the suspension as departure.

For a planned A → B flight that diverts to C, offer C → B for review. The user can change the destination before accepting; acceptance creates and immediately activates the leg and starts OFP generation. The diverted attempt retains its original planned destination B and actual arrival C.

Accepting re-dispatch creates an ordinary distinct leg and requests a fresh OFP using updated planning inputs available through the supported integration. Require neither a permanent lineage relationship nor a special recovery-leg subtype. Preserve the completed attempt's recorded timings, fuel data, original OFP association and return outcome independently. A failed generation must not make the original OFP appear current for the new leg. Verify that supported weather/runway input changes are reflected in the new request or generated result rather than copied blindly from the original plan.

---

**AC15 additional recovery scenarios — DEC-056/057:**

- Declare C during A → B, change it to E, then cancel before touchdown: resume paused preparation without repeating known success. Repeat with restart during the hold; restore intent and no automatic progression.
- Land at C without declaring intent, or declare E and actually land at C: converge on the same hold and C → B recovery option at full shutdown. Unknown identity holds; landing at original B resolves intent as normal arrival.
- Approve C → B at 14:25 after shutdown at 14:00: activate immediately and request off-block 14:25, with no turnaround or activation delay. Keep A → B and actual C as completed history. Default EZY1234 to EZY123R and copy IATA unchanged. Verify the equivalent return-to-A re-dispatch path.
- Preserve all scheduled baselines by default and allow eligible user edits. Reset remaining preparation, keep original ACARS messages, and allow a fresh automatic message in the rebuilt workflow. Discard old callbacks at the response boundary. Validate continuity using actual C at the history boundary without rewriting planned B.

**AC16 — Resource efficiency and background operation**

Against agreed M17 budgets, profile the release-packaged application's complete process tree with representative supported aircraft in MSFS 2020/2024. Cover idle/disconnected, active monitoring with the UI visible and minimised, dispatch/network activity, reconnection and a sustained rotation. Record CPU, private/working-set memory with consistent accounting, GPU activity, disk I/O, startup and peak usage. Compare repeatable simulator frame-time behaviour with and without AutoDispatch on the same scenario; distinguish measurement variability from regression. Verify no unbounded growth and no loss of operational monitoring when presentation activity is reduced. Hardware, durations and pass thresholds remain open; this criterion cannot be declared passed until they are agreed and measured.

---

## 9. Product Success Criteria

The application should enable a user to:

1. Build or import a realistic multi-leg flight rotation.
2. Monitor progress through that rotation in supported MSFS 2020 and MSFS 2024 configurations.
3. Understand each leg's own timing deviations and next-leg readiness, including future departure delay where a manual scheduled baseline exists.
4. Prepare the next flight at the appropriate point in the current flight.
5. Access reliable SimBrief planning information when available.
6. Receive and manage relevant application-generated operational messages.
7. Understand integration health without navigating through technical configuration screens.
8. Continue using the application when optional services, such as Hoppie, are unavailable.

The final product should remain focused on reducing the manual workload involved in operating consecutive simulated airline flights, while preserving the pilot's control over dispatch decisions and aircraft operations.

---

## 10. Discovery Decision and Change Record

This register records accepted product decisions alongside explicitly Proposed, Deferred and Superseded entries. DEC-046/050 record the accepted stack and high-level architecture; they do not establish integration/resource validation or a complete development baseline. Section 7 retains unresolved investigations and recorded answers. Superseded entries preserve the rationale and traceability of earlier decisions; apply their named replacements to current requirements.

| Decision | Status | Chosen approach and rationale | Affected requirements |
|---|---|---|---|
| DEC-001 — Direct integration | Accepted | Keep local-first, per-user authenticated API calls. No central service account or query backend is needed for the intended product. | D01, M06, M14 |
| DEC-002 — Automated planning | Accepted | Unattended generation is essential; preview is preferred and same-plan editing is acceptable to avoid duplicate plans. Manual browser generation does not preserve the product proposition. Actual API capability remains unverified. | M06, D01, AC05 |
| DEC-003 — Arrival dispatch | Accepted | Low-speed ground arrival is primary, shutdown is fallback. Include taxi-in only for the primary path; a successful primary OFP is not automatically replaced at shutdown. Supersedes shutdown-only final generation. | M05, M06, AC05 |
| DEC-004 — Leg handover | Accepted | Complete inbound at stationary/all-engines-off. Activate preloaded outbound after ten simulator minutes or immediately on an earlier departure. Keep dispatch and lifecycle independent. | M06, M16, AC12 |
| DEC-005 — Departure scope | Accepted | Merge pushback/taxi into DEPARTING; track off-block timing without classifying pushback providers or movement direction. Exact departure detection remains unresolved. | M04, M11, M16 |
| DEC-006 — Phase recovery and RTO | Accepted | Permit skipped intermediate phases. Provide a TAKEOFF-only manual RTO action instead of requiring automatic RTO detection. Landing does not require the full observed cruise-to-approach sequence. | M04, M16, AC03 |
| DEC-007 — Display phases | Accepted | Retain CRUISE and the agreed takeoff, climb, cruise and final-approach thresholds. Descent classification remains a working proposal under investigation. | M04, M11 |
| DEC-008 — Simulator and aircraft targets | Accepted | Target MSFS 2020/2024 and the listed aircraft families, with per-version validation and adapters/harnesses where necessary. Do not assume standard variables are universally reliable. | M04, D02, C04, AC13 |
| DEC-009 — Hoppie boundary | Accepted | Use the Hoppie network and user-configured aircraft clients; no direct aircraft ACARS bridge. Avoid conflating monitoring support and message-delivery support. | M09, D03, AC07 |
| DEC-010 — Operational time | Accepted | Use simulator time and UTC timestamps. Keep external-service timing independent; omit special manual-clock-change recovery. | M05, M12, M16, AC12 |
| DEC-011 — Scheduling scope | Accepted | Optional later-leg manual times, otherwise available OFP scheduled times. Keep own-leg delay and manually baselined future departure delay in MVP; defer automatic full timetables and full propagation. | M01, M02, M05, M11, S06, S07, AC04 |
| DEC-012 — Early readiness | Accepted | With a scheduled departure baseline, use the later of schedule and readiness. Preserve actual early departures and scheduled arrival baselines separately from live estimates. | M05, AC04 |
| DEC-013 — Library selection | Deferred | Retain OpenAP and other discovered libraries as candidates. Choose frameworks and validate integration cost before adopting stack-dependent components. | D02, Section 7 |
| DEC-014 — Automatic first-leg activation | Superseded | DEC-037 replaces automatic commencement with explicit user initiation. The connected, in-world, grounded, parking-brake-set and propulsion-engines-off conditions remain startup eligibility checks, with departure-airport validation if feasible. Powered turnaround states remain valid; ATR hotel mode remains outside initial scope. | M04, M06, M16, D02, AC12, DEC-037 |
| DEC-015 — Planning lock at departure | Superseded in part by DEC-058 | Permit edits and regeneration while Active before departure; lock planning when movement is confirmed as DEPARTING. Initial generation remains available for eligible subsequent legs without an OFP. The first leg now requires its OFP before activation under DEC-037. This supersedes the v0.2 activation-time planning lock. Current editing and return-to-gate rules are in DEC-058. | M01, M02, M06, M11, M16, AC02, AC05, AC12 |
| DEC-016 — Manual regeneration after edits | Accepted | Mark an affected OFP Out of date and offer Regenerate OFP while the leg is eligible and planning is unlocked. Let users finish multiple edits before requesting a replacement, instead of automatically generating after each change. API support and concurrent-request behaviour remain to be validated. | M06, M11, M16, AC05 |
| DEC-017 — Gate-arrival turnaround anchor | Accepted | Start turnaround at gate/on-block arrival, estimated during taxi-in and replaced by the recorded stationary/all-engines-off proxy when available. Keep touchdown separate. This aligns schedule comparisons with gate arrival while retaining the lightweight simulator detection rule. | M04, M05, M06, AC04 |
| DEC-018 — Pre-dispatch proximity calculation | Accepted | Use destination great-circle distance/current groundspeed × 60 solely to trigger advance preparation, with a configurable 20-minute default. This replaces dependency on a reliable landing ETA for that trigger and the proposed fixed 100 NM alternative. It is explicitly not a hard ETA and must not feed schedule/readiness calculations. Preserve independent final-OFP arrival triggers. | M06, M14, D02, AC05, AC14 |
| DEC-019 — Phase-independent pre-dispatch | Accepted | Permit skipped phases and evaluate pre-dispatch independently of the observed phase sequence. Once airborne is confirmed, trigger as soon as proximity and eligibility conditions are satisfied, including short sectors already inside the threshold. Reject a CLIMB/CRUISE or 1,500 ft AGL prerequisite and do not require a threshold crossing. This prevents missed phases or short flight profiles from suppressing advance preparation. | M06, AC14 |
| DEC-020 — Returns, diversions and recovery choices | Accepted | Recognise returns to departure and diversions as arrival outcomes; complete the inbound at stationary/full shutdown. Suspend automatic onward generation and activation until the user confirms or adjusts the rotation. Offer re-dispatch after a return and addition of a repositioning flight after a diversion, without automatically creating either. This avoids dispatching the unchanged onward sequence from the wrong airport. Recovery-leg details and airport-identification reliability remain open. | M04, M06, M16, AC12, AC15 |
| DEC-021 — Fresh re-dispatch after return | Accepted | Create a new leg and generate a fresh OFP when the user accepts re-dispatch after a return to departure. Preserve the original attempt and its recorded history. Refresh planning conditions because weather, runway selection and other inputs may have changed; available data and API support still require verification. | M06, M16, AC15 |
| DEC-022 — Repositioning route default | Accepted | After a diversion, default the optional repositioning leg to the actual diversion airport → original planned destination, allowing destination edits before OFP generation. This normally restores the aircraft to the airport expected by the remaining rotation. | M16, AC15 |
| DEC-023 — Recovery prompt timing and skip option | Accepted | Suspend onward automation upon confirmed unexpected arrival; show recovery choices at stationary/full shutdown. Alongside re-dispatch/repositioning, allow skipping recovery and continuing with the next scheduled leg, with manual repositioning the user's responsibility. Preserve the completed attempt without inventing a recovery flight. Require explicit Resume next leg confirmation after repositioning, preventing relocation/loading from triggering automatic activation or departure detection. | M16, AC15 |
| DEC-024 — Reliable automatic airport identification | Accepted | Require robust automatic arrival-airport identification in normal supported operation. If identity remains unknown or ambiguous, hold onward automation and request manual confirmation, then apply the appropriate arrival rules. Manual confirmation is exceptional recovery, not the intended normal workflow. Validate correctness, decision latency and fallback frequency before declaring support; method and numerical criteria remain open. | M16, D02, AC15 |
| DEC-025 — Immediate telemetry recovery with phase skipping | Accepted | Retain the active leg through a temporary SimConnect disconnect, reconnect automatically and resume from the next valid observation. Skip missed phases, including directly entering CLIMB after an unobserved TAKEOFF. Do not require recovery confirmation or invent missing event times. Preserve normal validation, existing operational suspensions and duplicate-prevention rules. | M16, AC03 |
| DEC-026 — No late attachment in MVP; ground-only operational dispatch | Accepted | Exclude attaching to or importing an already-underway flight as the monitored leg from MVP. Allow future schedule preparation while airborne, but require confirmed ground state for operational OFP dispatch. Preserve airborne advance preparation for an already monitored rotation and recovery of an already-active leg. This keeps MVP startup within the supported ground workflow; future late-attachment support may be reconsidered but is not committed. | M06, M16, AC05 |
| DEC-027 — Automatic restart recovery of one working rotation | Accepted | Persist the single current working rotation, including pending legs, active-leg progress, completed history and associated messages. Automatically restore its previously active leg after restart and continue from current valid telemetry. No multiple saved rotations, rotation library or reusable templates in MVP. The product owner clarified that the persistence scope is the active rotation, not just its active leg. A filesystem recovery file is a candidate, not a selected architecture. | M15, AC11 |
| DEC-028 — Temporary planning lock during OFP generation | Superseded by DEC-058/059 | Lock the affected leg's planning inputs while generation/regeneration is pending, preventing edits from diverging from the submitted request. Release the temporary lock when the OFP is returned or failure is definitive, without overriding the departure lock. If the response arrives after departure, make the OFP available while preserving monitoring, recorded events and the departure lock; no separate recovery workflow. Uncertain outcomes remain subject to API investigation. Historical generation locks and indefinite uncertain-result treatment are replaced by DEC-058/059. | M06, M11, M16, AC05 |
| DEC-029 — Preliminary message content and unavailable uplift | Superseded | DEC-042 replaces the uplift/gate-fuel-prediction requirement with current-leg arrival-fuel planning information from the OFP or supported Navigraph/SimBrief API data. Next-flight identity/route, available departure estimate, advance block fuel and passenger count remain applicable. Missing planning data must not suppress other available message information. | M09, AC07, DEC-042 |
| DEC-030 — Single preliminary message for subsequent legs | Accepted — amended by DEC-057 | Generate one automatic preliminary dispatch message per eligible subsequent leg at the configured advance/proximity threshold (default 20 minutes or less). No preliminary message for the first leg. Do not automatically send revised messages as estimates change; further updates require an explicit user request. Failed-submission retries concern the same message and stop at Hoppie acceptance under DEC-039. The single-message rule now applies per workflow, with accepted recovery allowing a fresh workflow while preserving original messages. | M06, M09, AC07 |
| DEC-031 — Separate departure and arrival timing | Accepted | Display off-block and on-block timing against their respective scheduled baselines, distinguishing estimates from actual events. Retain independent departure and arrival deviations/statuses; missing comparison inputs remain unknown. Supersedes the single overall timing-status requirement and its unresolved priority rule. The supplied Volanta example illustrates the separation without prescribing a UI layout. | M05, M11, M16, AC04 |
| DEC-032 — OFP-filed planning times and simulator-time actuals | Accepted | MVP displayed timing estimates are OFP-filed planning times; actual events use simulator UTC. Defer real-time arrival-ETA predictions and investigation of their sources/methods to post-MVP under S08. Preserve independent departure/arrival comparisons, the proximity-only pre-dispatch trigger and agreed turnaround-readiness calculations. | M02, M05, M06, M11, S08, AC04, Section 7 questions 6/15/18 |
| DEC-033 — Aircraft setup and preferred saved-airframe selection | Accepted | Selection from the authenticated user's personal saved SimBrief airframes is the preferred workflow, conditional on verified API access. General-catalogue aircraft/variant selection with manual setup and an optional airframe Internal ID is an accepted MVP alternative. No mandatory or bulk ID entry/import. Personal listing capability remains unconfirmed and is a Navigraph enquiry item. | M02, D01, AC01, Section 7 question 8 |
| DEC-034 — No manual event-time editing in MVP | Accepted | Exclude manual entry/correction of actual off-block, takeoff, landing and on-block timestamps. Keep simulator-recorded actuals and leave missed times unknown. This preserves recorded operational history without adding timestamp-editing workflows. Existing RTO, airport-confirmation and rotation-recovery actions remain supported. | M01, M04, M05, M11, M16, AC02, Section 7 question 7 |
| DEC-035 — New Rotation and automatic completion clearing | Accepted | Provide New Rotation with confirmation before replacing an existing rotation. Automatically clear after normal final-leg stationary/full-shutdown completion. A final-leg return/diversion instead prompts for recovery or explicit Finish and clear rotation confirmation; retain the rotation until resolved. Remove rotation-specific local history, OFP associations and messages on clearing; retain credentials, settings and airline/turnaround profiles, and leave SimBrief data untouched. No MVP archive. | M01, M15, S02, AC01, Section 7 question 9 |
| DEC-036 — Scheduled, Filed and Actual time semantics | Accepted | Keep three values per off-block/on-block event. Scheduled is manual or initialised from the first OFP; later OFPs update Filed only. Explicit permitted pre-departure schedule edits may change the baseline. Actual is simulator-observed. Persistently show Scheduled versus Actual, with Scheduled versus Filed on hover; missing Actual remains unknown. This supersedes the earlier proposal to use Filed as the main pre-event display. | M02, M05, M11, AC04, Section 7 question 18 |
| DEC-037 — Manual startup with OFP-gated commencement | Accepted | Start Rotation initiates the startup workflow and first-leg OFP generation. The rotation commences and its first leg becomes Active only when SimBrief successfully returns that flight plan, subject to retained aircraft/world readiness checks. This supersedes DEC-014's automatic start and the former assumption that the first leg could activate without an OFP. Pending acknowledgement or failure does not commence the rotation. Subsequent-leg automation and recovery of an already-started rotation remain supported. | M01, M06, M16, AC05, AC12, Section 7 question 17 |
| DEC-038 — Preliminary-message recipient | Accepted | Send the upcoming leg's preliminary message to the active inbound leg's ATC callsign, which the user must match in the aircraft's Hoppie client. Identify and associate the upcoming leg separately from the network recipient. This delivers advance information to the flight currently being operated. | M09, AC07 |
| DEC-039 — Hoppie submission retries stop at acceptance | Accepted | Keep every generated message in the in-app ACARS log. Permit retries when submission fails at the request boundary, but stop once Hoppie positively confirms receipt/acceptance. Never resend an accepted message because cockpit delivery/read confirmation is absent. The local log covers failed/unconfigured Hoppie without interrupting the rotation. Retry limits and ambiguous lost-response handling remain technical questions. This refines the earlier blanket no-retry rule. | M09, D03, AC07 |
| DEC-040 — Provisional product name and Hoppie sender | Superseded in part by DEC-055 | Originally selected AutoDispatch as both provisional application name and shared Hoppie sender. The application name remains accepted; DEC-055 replaces only the sender choice following documented callsign-locking evidence. The recipient remains the current inbound ATC callsign. | Product overview, M09, D03, open question 23, DEC-055 |
| DEC-041 — Departure signals and aircraft research scope | Accepted | Exclude door checks and pushback-specific detection; retain engine-off pushback and self-powered departure within DEPARTING. Start with standard SimConnect telemetry and use SimvarWatcher for validation. Defer the wider aircraft-specific variable/SDK research, retaining adapters as a fallback for demonstrated gaps. The supplied PMDG 737 SDK is evidence for that aircraft family, not verified 777 compatibility. The final movement/brake/beacon/engine rule remains open. | M04, D02, AC03, AC13, open question 11 |
| DEC-042 — Planning fuel data; uplift outside scope | Accepted | Base preliminary inbound fuel estimates on the current leg's burn and estimated arrival fuel from either the OFP or supported Navigraph/SimBrief API data, accounting for alternate fuel when diverted to that alternate using verified field semantics. Do not build a live gate-fuel predictor. Actual uplift (next-leg block fuel minus fuel at gate) is a loading concern outside the app's remit. Defer FMC/SDK fuel predictions and engine-start fuel adjustments for extra pilot-loaded fuel to future enhancements. Supersedes DEC-029's uplift requirement while retaining the other agreed message content and single-message/recovery rules. | M04, M06, M09, C05, scope exclusions, AC07, open question 22 |
| DEC-043 — Aircraft fuel evidence and access principles | Accepted | Separate established transport mechanisms from numerical destination-EFOB support, which is unverified for every aircraft. Prefer passive read-only access and SimConnect where feasible; permit necessary proprietary interfaces. Avoid screen parsing, OCR and page manipulation as primary approaches. Keep compatibility extensible. Shared transports/adapters and FuelPredictionProvider remain proposals, not accepted architecture. Preserve C05's future scope and DEC-042's MVP planning sources. | C05, D02, open question 24 |
| DEC-044 — Backend and presentation separation | Accepted | Keep domain logic, engines, processing and external requests in a backend clearly separated from presentation, with core behaviour testable independently of the UI. Package the product as a Windows application launched through its own executable. At the time of this decision, language/framework/process choices were open; DEC-046/050 now settle those high-level choices. Installer/portable packaging remains undecided; this does not require a literal single-file binary. | D02, open question 20 |
| DEC-045 — Resource efficiency is a primary constraint | Accepted | Minimise the complete application's resource overhead alongside resource-intensive MSFS 2020/2024, including framework, backend and integration helpers. Preserve DEC-044 separation. Select the stack using measured end-to-end behaviour rather than library convenience or installer size alone; numerical budgets and benchmark scenarios remain open. | M17, AC16, open question 20 |
| DEC-046 — Electron, TypeScript and React stack | Accepted | TypeScript throughout with React presentation in an Electron-packaged Windows application; process boundaries are accepted under DEC-050. node-simconnect remains the candidate transport. Selected after comparison with Tauri/Rust, NodeGUI, Neutralinojs, Wails and Flutter (15 November 2026), favouring the inspected TypeScript transport coverage, fewer cross-language/runtime boundaries and fit with the product owner's development approach. These are selection reasons, not proof that no other library can meet the requirements. Chromium overhead remains a primary constraint under DEC-045; numerical budgets and representative measurements remain required under PRE-08. Native aircraft adapters remain possible where standard telemetry is insufficient. Installer size is accepted as a distribution trade-off; comparative estimates are retained below as unverified, not measured acceptance evidence. | D02, M17, AC16, question 20, PRE-03/07/08 |
| DEC-047 — Manual-only skipping of unflown legs | Accepted | Allow an unflown leg to be skipped only through explicit user intervention, via a recovery/skip control or removal in the rotation editor. Never automate the skip. UI placement remains design work; retain existing locks, continuity checks and manual-repositioning/resume protections. | M01, AC02, question 19, PRE-04 |
| DEC-048 — No special first-OFP readiness-loss workflow | Accepted | Exclude special handling for readiness lost while the first OFP is generated: the OFP is required for preflight and this edge case does not justify additional MVP complexity (YAGNI). Retain normal eligibility, response association and generation failure handling. | M16, question 17, PRE-04 |
| DEC-049 — Shutdown resolves timing gaps through normal handover | Accepted | Valid on-ground, stationary, all-engines-stopped completion after flight establishes gate arrival and proceeds through the existing next-leg workflow despite missing touchdown or an exceeded taxi-in estimate. Preserve unknown actuals, turnaround, activation timing, final-leg clearing and airport/recovery holds; no separate timing-gap prediction/recovery engine. | M05, M16, AC04, question 16, PRE-04 |
| DEC-050 — Three-layer hexagonal architecture in the utility process | Accepted | The Electron utility process hosts two architecturally separated layers: a **domain layer** of pure TypeScript modules with no Node/platform/framework dependencies (rotation model, phase state machine, dispatch engine, timing/scheduling, ACARS message generation) and an **integration layer** providing concrete adapters for external systems (SimConnect via node-simconnect, Navigraph/SimBrief, Hoppie, airport timezone resolution, file-based persistence). The domain layer defines port interfaces; the integration layer implements them. Dependencies point inward: domain modules never import integration or platform code. The renderer (React) is pure presentation receiving state snapshots and sending commands via IPC. The main process stays thin: window lifecycle, IPC routing between renderer and utility process, credential storage via safeStorage and utility-process supervision. Persistence belongs in the integration layer within the utility process to avoid IPC round-trips for frequent state writes; only credential operations use the main process's safeStorage via IPC. This enables domain-logic testing with synthetic telemetry, no MSFS or network required. | DEC-044, DEC-046, M15, M16, M17, AC13, PRE-09 |
| DEC-051 — Removal preserves history without live orphan references | Accepted — amended by DEC-057 | Removing an eligible unflown leg retains its messages and required immutable planning provenance for the current rotation lifetime. Historical leg identifiers may reference the removed leg; live operational references must resolve and be reconciled in the same change. Prune unused records, preserve explicit recovery holds, and prevent retained history or late responses from recreating/dispatching the leg. This closes the removal/reload consistency gap without retaining a hidden leg or adding an archive. Retained messages are self-contained audit records; full historical planning graphs are no longer required. | M01, M09, M15, AC02/07/11, PRE-09 |
| DEC-052 — Ordering edits respect unresolved planning eligibility | Superseded by DEC-058 | Reject user insertion/removal/reordering that changes an unresolved request's startup-first-leg or inbound/next-leg eligibility context. Preserve order/request together, retain the temporary lock for uncertain outcomes, and allow unaffected later-leg edits. Capture/recheck context for dependent effects; leg ID and input revision alone are insufficient. Ordinary handover/departure while an OFP is pending remains allowed. Eligible edits now invalidate affected request context; first-generation overlay remains blocking. | M01, M06, AC02/05, PRE-09 |
| DEC-053 — Recovery creates ordinary legs without permanent lineage | Accepted | Re-dispatch/repositioning creates an ordinary new leg with a fresh plan and identity. Preserve the original completed attempt independently; no durable recovery-of link or special recovery subtype is required. Aligns M16 with the product owner's recorded model clarification. Temporary recovery-hold context remains until the workflow is resolved. | M16, AC15, DEC-021/022, PRE-09 |
| DEC-054 — Bound persistence validation before expanding guarantees | Accepted | Start with the required normal-restart and unexpected application/backend-process termination cases, including action/clear persistence. Decide broader OS-crash, sudden-power-loss and device-cache guarantees explicitly under PRE-09 before expanding the test programme or recovery machinery. These broader guarantees remain open, neither promised nor waived. JSON remains the preferred design candidate; no writer or complete schema is approved and no validation gate is closed. | M15, AC11, PRE-09 |
| DEC-055 — Identifiable flight-based Hoppie sender and conflict retries | Accepted — format validation pending | Prefer AD<current inbound ATC callsign>, e.g. ADEZY1871. Replaces DEC-040's shared sender only; AutoDispatch remains the product name. Considered shared airline OPS, arbitrary installation identifiers and flight-based AD identifiers; choose cockpit recognition with narrower collision exposure than a shared airline sender, accepting residual same-flight collisions. Validate length, characters and cockpit display before implementation; do not silently truncate. Explicit callsign-already-in-use rejection permits bounded delayed retries of the same message with frozen sender/recipient/content. Retain the local log and continue the rotation on exhaustion. Positive acceptance ends retries; ambiguous timeouts/lost responses do not justify blind resubmission. Exact retry timing, limits and expiry/cancellation remain PRE-06 work. No live compatibility claim or automatic sender switching is introduced. | M09, D03, AC07, DEC-039/040, questions 5/23, PRE-06 |
| DEC-056 — Diversion intent and approval-controlled recovery | Accepted | Divert declares an editable/cancellable intended ICAO before touchdown, retaining the planned route and pausing onward workflows. Monitoring continues. Actual arrival determines outcome; declared and detected diversions/returns converge on the same persisted hold. At full shutdown, user acceptance creates a fresh recovery leg, activates it immediately and requests off-block at approval-time simulator UTC, bypassing turnaround and ten-minute activation. Default ATC callsign is first up-to-six original characters plus R; optional IATA number stays unchanged. Manual repositioning still requires Resume. Continuity uses actual arrival at the completed-history boundary. | M01/05/06/16, AC02/12/15, PRE-04/05/09 |
| DEC-057 — Reset preparation, retain rotation ACARS history | Accepted | Recovery acceptance resets remaining generated preparation while preserving completed history, stable remaining leg identities, user inputs and Scheduled baselines by default. Users may edit eligible times. Original messages retain frozen context/outcomes for audit; no historical leg copies, full planning graphs or version browser. A fresh workflow may issue a fresh automatic message. Revisions reject obsolete responses; retained history cannot drive retries. Cancellation before touchdown resumes paused work rather than resetting it. Simplifies DEC-051 and amends DEC-030. | M01/06/09/15/16, AC02/07/11/15, PRE-09 |
| DEC-058 — Editing eligibility and asynchronous later planning | Accepted | First generation blocks user interaction with a loading overlay; later generation uses a background toast/indicator and does not lock otherwise eligible edits. Current-leg edits require fresh parked/engines-off telemetry; engine start/taxi-out closes editing, but a pre-flight return to gate reopens it preserving actuals. Airborne/completed legs stay locked. Airport changes invalidate downstream planning and require explicit regeneration from the current eligible leg, otherwise the next eligible leg. Edits/reset invalidate request revision/context; no assumed remote cancellation. Replaces DEC-028/052 and the permanent-at-taxi lock in DEC-015. | M01/06/11/16, AC02/05/12, PRE-02/04/09 |
| DEC-059 — Bounded SimBrief retries and degraded continuation | Accepted — adapter validation pending | One initial attempt plus up to three retries for no usable OFP, including timeout/lost/corrupt results; possible remote duplicate plans are accepted in this failure scenario. Adopt one valid matching result and stop retries; disregard obsolete/additional responses. Exhaustion preserves inputs and offers manual Retry with a fresh budget. Already-started rotations may continue monitoring without planning data; first startup still requires an OFP. Hoppie stays conservative: confirmed rejection may retry within bounds, acceptance ends retries, uncertainty never causes blind resend. Retry timing/provider limits/response validation remain integration work; the SimBrief attempt count is settled. | M06/09/15/16, AC05/07/11/12, PRE-01/02/06 |
| DEC-060 — Minimal transactional state and IPC | Accepted — request representation amended by DEC-062; writer validation pending | Backend owns operational state. UI submits typed, runtime-validated requests and receives snapshots. The original formal-enum requirement is superseded by DEC-062 named endpoints and shared request/response definitions. Related writes are transactional, deterministic for captured inputs and idempotent against duplicate command delivery; reads expose complete committed state. Publish success/send dependent effects only after commit. Save failure shows error with no unsaved operational mode. Unreadable state is preserved with a recovery error and fresh-rotation option. Settings/credentials remain separate. Prefer JSON filesystem snapshots; use SQLite only if unsuitable. No general version history, automatic backend-restart or heartbeat framework is added. DEC-050 boundaries and DEC-054 bounded validation remain. | M14/15/16, AC11/13, PRE-09 |
| DEC-061 — Design closure with prototype validation deferred | Accepted | At the product owner's direction, issue #20 closes on explicit data-model, typed IPC and transactional storage/error contracts. Defer executable persistence validation to early development alongside the planned flight-monitoring harness; add writer/restart checks when the writer exists. Flight-phase observations alone do not prove storage reliability. JSON remains preferred and SQLite fallback. OS-crash/power-loss/device-cache guarantees remain undecided under DEC-054. No AC/PRE validation result or overall development-baseline approval is implied. | M15/16, AC11/13, PRE-09, issue #20 |
| DEC-062 — Named internal endpoints and shared request/response definitions | Accepted | At the product owner's direction, use controller-style named methods accepting typed request DTOs and returning typed responses over fixed local IPC endpoints. Frontend and backend share platform-independent contracts. The endpoint selects the handler and validators; do not infer operations from payload shape, because distinct operations may have identical fields. Formal command enums and runtime request classes are not required. Validate both directions, correlate replies with calls and include endpoint identity in duplicate-command checks. Amends only DEC-060's request representation; ownership, transactional behaviour, security boundaries and DEC-061 validation deferral remain. | M14/15, AC11/13, PRE-09, issue #20 |

**DEC-046 evidence qualification:** The architecture discussion supplied estimates of a 5–20% Windows WebView2 memory advantage and approximately 80–150 MB Electron versus 10 MB Tauri installers, alongside claims of exclusive node-simconnect API breadth and no meaningful savings from a Node sidecar. Retain these as unverified comparison claims, not AutoDispatch benchmarks or exhaustive library findings. They do not establish CPU/RAM/FPS budgets, deployment sizes or guaranteed performance. Stack selection is accepted; PRE-03/PRE-08 must supply the relevant application evidence.

**DEC-056–060 provenance:** Explicit product-owner decisions in the issue #20 review conversation, consolidated 16 November 2026. These are product/design approvals, not vendor capability evidence, executable tests, writer validation or development-baseline approval. Earlier decision rows retain historical rationale with supersession noted.

**DEC-061 provenance:** Product-owner instruction to defer executable validation to the early-development prototype and finish the explicit contracts, recorded 17 November 2026. The local data/IPC contracts are submitted for review in PR #23; this sequencing decision does not establish their implementation or validation.

**DEC-062 provenance:** Product-owner clarification on 17 November 2026: prefer request types passed as handler parameters, analogous to controller methods, with internal endpoints to prevent shape collisions. This is a local contract decision, not a request to add an HTTP server or implement the application.

### Revision history

| Version | Purpose and changes |
|---|---|
| v0.2 | Original input to collaborative discovery. Subsequent decisions identify the behaviours superseded during review. |
| v0.3 | Working discovery revision: replaced the original in-flight final-OFP trigger with advance preview/planning plus arrival-trigger generation; removed the browser-only viability fallback and separate taxi-out phase; expanded simulator/aircraft targets; narrowed automatic schedule/propagation scope; added simulator-clock, handover and testability requirements. Successive updates incorporated decisions through DEC-049, SDK/library research and PRE-01–PRE-10. The preserved snapshot captures that complete working revision. |
| v0.4 — 14 November 2026 | Consolidated discovery edition. Retains all requirement IDs, acceptance criteria, decision history, numbered questions, source references and pre-implementation actions from the v0.3 snapshot. Adds a consolidated product-position summary and question-status index; makes the agreed grounded/after-flight completion rule explicit in the phase and handover descriptions; aligns evidence summaries with the completed source reviews. No new stack, integration capability or deferred feature is approved by this version. |
| v0.4 amendment — 15 November 2026 | Reconciles DEC-046 stack acceptance and DEC-050 high-level architecture across current status, D02, question 20, PRE-07/PRE-09 and README. Integration/resource validation and detailed domain/storage design remain open. Earlier research is retained as history; unsupported comparative estimates are identified as unverified. Product requirements and acceptance criteria are unchanged. |
| v0.4 domain-review amendment — 15 November 2026 | Adds DEC-051–054: removal/reference closure, ordering protection during unresolved requests, ordinary recovery legs without permanent lineage, and bounded persistence validation with broader guarantees explicitly open. Updates M01/M15/M16 and AC02/AC11/AC15; preserves other requirements, evidence and outstanding questions. |
| v0.4 Hoppie amendment — 15 November 2026 | Adds DEC-055: preferred identifiable AD plus inbound callsign sender and bounded delayed retries for explicit conflict rejection. Partially supersedes DEC-040; updates M09, D03, AC07, question 23 and PRE-06. Format compatibility, retry parameters and live validation remain open. |
| v0.4 readiness review — 16 November 2026 | Incorporates product-owner DEC-056–060 for diversion intent/recovery, preparation reset with ACARS retention, editing and background generation, bounded SimBrief retries, and minimal transactional state/enum IPC. Updates requirements and acceptance criteria; PRE statuses and development-baseline approval remain unchanged. |
| v0.4 contract review — 17 November 2026 | Adds DEC-061 design-only closure of #20 and the early-development prototype handoff. Explicit local data/IPC contracts specify field types, command payloads, replies, credential boundaries and diagnostic limits; executable validation and PRE statuses remain open as recorded. |
| v0.4 IPC interface clarification — 17 November 2026 | Adds DEC-062: replace formal command-enum requirements with named local endpoints and shared request/response definitions. Preserve transactional/revision checks and explicit validation; endpoint identity prevents collisions between otherwise identical request shapes. |
| v0.4 fuel reference — 17 November 2026 | Records dated ACARS Link static source and fixture evidence for its OFP-based landing fuel message. No product decision, field validation or approval status changes. |
| v0.4 Hoppie research — 17 November 2026 | Records the user-performed Fenix receipt and retry direction. The user considers #18's discovery work complete; its unverified criteria and PRE-06 remain open, without development-baseline approval. |
| v0.4 Navigraph evidence amendment — 18 November 2026 | Records documented desktop authentication/access route, legacy plan correlation/capacity inputs and public catalogue retrieval; narrows questions 1–4/8 and PRE-01/02. Adds dated forum evidence and the unverified V2 static-ID continuity assumption. Preserves DEC-056–062 and all remaining generation, permission and validation gates. |

**Consolidated decision coverage:** Rotation/startup/editing/clearing and persistence (DEC-014–016, 027/028, 033–037, 047/048); simulator-time and schedule semantics (DEC-010–012, 017, 031/032/036); monitoring, handover, recovery and timing gaps (DEC-003–009, 018–026, 041/049); preliminary messaging, Hoppie and fuel scope (DEC-029/030, 038–043); local integration, backend separation, efficiency, accepted stack and architecture (DEC-001/002/013, 044–046, 050). Targeted domain/persistence review corrections are recorded in DEC-051–054; the issue #20 product-owner review adds DEC-056–060 and explicitly supersedes the affected older rules. The full rows above retain statuses, rationale and affected requirements.

Resolve or explicitly agree the treatment of MVP-critical questions in Section 7 before approving the development baseline. Deferred capabilities such as C05 do not block it. Detailed architecture and delivery plans remain separate follow-on work; this revision does not authorise application implementation or remote-resource creation.

---

**Document version:** 0.4  
**Status:** Consolidated discovery — stack and high-level architecture accepted; detailed design and technical validation pending  
**Next step:** Work through PRE-01–PRE-10, beginning with the Navigraph viability dependency and independently progressing simulator/resource validation and application architecture. Preserve accepted product decisions; settle the remaining technical details before approving a development baseline and implementation plan.
