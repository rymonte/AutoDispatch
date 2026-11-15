# AutoDispatch

A local-first Windows desktop application for managing multi-leg airline rotations in Microsoft Flight Simulator 2020 and 2024, subject to integration validation.

The planned application coordinates flight monitoring, turnaround timing, SimBrief flight planning and preliminary dispatch messages through Hoppie ACARS.

## Project status

Discovery and technical validation. Electron, TypeScript and React are the accepted stack (DEC-046). DEC-050 defines a React presentation layer, a thin Electron main process, and a separate backend utility process with independent domain modules and integration adapters. Application implementation has not started; integration/resource validation and detailed domain, storage and recovery design remain outstanding.

## Documentation

- [Current PRD — v0.4](prd.md): product requirements, acceptance criteria, integration evidence, decisions and outstanding questions.
- [Pre-implementation action checklist](prd.md#pre-implementation-action-checklist): remaining validation and design work before the development baseline.
- [Previous PRD — v0.3](prd-v0.3.md): preserved discovery snapshot.
- [Domain, state and persistence proposal](domain-persistence-proposal.md): detailed recommendations for review; stack/process decisions are recorded in the PRD.
- [Data model proposal](data-model-proposal.md): proposed objects, fields and invariants; detailed storage choices remain subject to review and validation.

Accepted product, stack and high-level architecture decisions are recorded in the PRD. Detailed design proposals and unverified integration capabilities remain explicitly identified; these decisions do not imply development-baseline approval.
