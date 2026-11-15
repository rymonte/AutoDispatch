# AutoDispatch

AutoDispatch (provisional name) is a planned local-first Windows desktop application for flight simulation enthusiasts operating consecutive sectors with the same aircraft.

## Status and planned capabilities

**Discovery / pre-implementation. No application code, approved development baseline or downloadable application exists.** Requirements are agreed; technical feasibility and detailed design remain outstanding.

The planned MVP manages one working multi-leg rotation, CSV/manual schedule entry, simulator flight monitoring, turnaround scheduling, supported unattended SimBrief planning, recovery and an internal preliminary dispatch message centre with optional Hoppie ACARS. These are requirements, not implemented features. MSFS 2020/2024 and aircraft compatibility are intended and unvalidated. Navigraph permission and supported unattended generation remain a product-viability dependency.

DEC-046 accepts Electron, TypeScript, React and Node.js execution. DEC-050 separates pure domain modules and integration adapters within a utility process, React presentation and a thin Electron main process. Data stays local; user-authorised external requests go directly to services. SimConnect (candidate transport: node-simconnect), Navigraph/SimBrief, Hoppie and airport/timezone services are planned integrations, not verified capabilities.

## Follow and contribute

Follow repository issues and pull requests; use the issue forms for findings, bugs, suggestions and proposed decisions. Suggestions do not automatically enter MVP scope. See [contribution guidance](CONTRIBUTING.md), the [agent contract](AGENTS.md) and [local checks](docs/development/quality.md). Future releases will be published through repository Releases once available.

## Authoritative documentation

- [PRD v0.4](prd.md): scope, ACxx criteria, DEC-xxx decisions and PRE-01?PRE-10 baseline gates.
- [Previous discovery snapshot](prd-v0.3.md).
- [Domain and persistence proposal](domain-persistence-proposal.md) and [data-model proposal](data-model-proposal.md): detailed proposals remain subject to approval.
- [Architecture and security baseline](docs/architecture/boundaries.md).
- [Testing strategy](docs/testing/strategy.md) and [release readiness](docs/releasing/readiness.md).
- [Repository audit and GitHub settings](docs/development/repository.md).

## Licence and affiliation

AutoDispatch is source-available under [PolyForm Noncommercial 1.0.0](LICENSE). Non-commercial use, modification and redistribution are permitted under its terms; commercial resale is not authorised. This is not an OSI-approved open-source licence. See [copyright notices](COPYRIGHT.md) and the [licensing policy](docs/development/licensing.md). Contributors retain copyright in their contributions.

AutoDispatch is an unofficial project, not affiliated with or endorsed by Microsoft, Asobo, Navigraph/SimBrief, Hoppie or aircraft/add-on vendors. Names and trademarks belong to their respective owners. Intended integration does not imply permission, compatibility or endorsement.
