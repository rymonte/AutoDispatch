# Licensing policy

## Approved project licence

AutoDispatch uses **PolyForm Noncommercial License 1.0.0**, approved by the maintainer on 15 November 2026. The canonical, unmodified terms are in [LICENSE](../../LICENSE), obtained from the [official plain text](https://polyformproject.org/licenses/noncommercial/1.0.0.txt). The project is intended to remain free, with optional donations.

AutoDispatch is source-available freeware, not OSI-approved open source. Non-commercial use, modification and redistribution are permitted according to the licence, including its expressly permitted purposes. Renaming or reskinning copied code does not remove its licence obligations. Preserve the licence or its URL and the supplied Required Notice lines when distributing covered material. [COPYRIGHT.md](../../COPYRIGHT.md) provides the project's notice using the maintainer's existing GitHub identity; contributors retain their own copyrights. Separately licensed third-party material remains under its own terms.

This is a summary; the licence controls. PolyForm does not require publication of derivative source code and does not supply a detailed policy for donations, advertising or paid bundles. No custom restrictions or donation exceptions have been added. Check hosting terms and permissions for all included material before distribution. Do not assume contributor-owned code can be commercially relicensed by the maintainer. Release packaging must include the licence and applicable copyright notices.

## Contributions

Original contributions intentionally submitted for inclusion are licensed under the same PolyForm Noncommercial terms as described in [CONTRIBUTING.md](../../CONTRIBUTING.md). Contributors keep copyright; no copyright assignment or separate contributor licence agreement (CLA) is required. Contributions grant no additional commercial licensing rights to the maintainer. Contributions grant neither project governance rights nor entitlement to donations. Accepted work is acknowledged in release notes unless the contributor opts out; maintain required notices separately.

## Candidate LGPL dependency

PRD D02 records node-simconnect metadata as LGPL-3.0-or-later. It remains a candidate, not adopted. A non-commercial restriction must not be applied to LGPL-covered library code. Assess whether the actual combined-work arrangement can satisfy both licences before adoption; this policy does not establish compatibility. LGPL does not automatically require licensing the entire application under GPL. If adopted, review the exact version, licence files, modifications and combined-work distribution under [LGPLv3 sections 2-4](https://www.gnu.org/licenses/lgpl-3.0.html).

Plan to preserve library attribution and GPL/LGPL texts, provide corresponding library source including modifications, and satisfy the applicable combined-work route allowing users to modify/recombine or replace the library. Do not prohibit reverse engineering needed to debug library modifications. Installation information may be required where the licences' conditions apply. A separately replaceable library is potentially simpler than bundling it irreversibly into application code, but JavaScript imports alone do not prove compliance.

Electron bundling, minification, ASAR archives, integrity checks, signing and auto-updates can affect practical library replacement. Test the actual Windows package, retain required build/recombination materials and ensure signatures/update policy do not defeat the chosen compliance route. Approve this plan before adopting the dependency; do not assume a separate utility process removes obligations.

Microsoft SDKs and aircraft/vendor SDKs have separate terms. Inventory exact redistributed files and versions; verify permissions for DLLs, headers, samples, datasets and binaries, attribution/EULA obligations and API usage terms. PRD's PMDG review identifies distribution/EULA questions, not blanket permission. Do not redistribute SDKs or proprietary research artifacts based on availability alone. SimBrief/Hoppie service access and trademarks require their own checks. Third-party code retains its own licence independently of AutoDispatch's selected licence.
