# Licensing recommendation ? pending approval

No licence has been selected or granted. The maintainer must approve the licence and identify the copyright holder before a LICENSE file is added. This recommendation is a distribution-planning assessment; verify the actual dependency versions and packaged artifact before release.

| Candidate  | Commercial reuse and derivatives                                                                                | Patent and notice considerations                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| MIT        | Permissive, including proprietary derivatives and binary sales                                                  | Preserve copyright/licence notices; no express patent grant                                                    |
| Apache-2.0 | Permissive commercial reuse and derivatives                                                                     | Express contributor patent grant/termination; retain licence, applicable notices and mark modifications        |
| GPLv3      | Commercial use permitted; distributed covered derivatives remain copyleft with corresponding-source obligations | Patent provisions and distribution/install requirements; stronger reciprocity increases downstream constraints |

Recommend **Apache-2.0**, subject to approval, for permissive community/commercial reuse with explicit patent terms. MIT is simpler; GPLv3 fits a deliberate strong-reciprocity policy. All require reviewing dependency compatibility, contribution rights and redistribution notices; a Windows installer is distribution, not an exemption. No contributor agreement is proposed for this solo-maintainer project.

Sources: [MIT text](https://opensource.org/license/mit), [Apache-2.0 text](https://www.apache.org/licenses/LICENSE-2.0), [GPLv3 text](https://www.gnu.org/licenses/gpl-3.0.html).

## Candidate LGPL dependency

PRD D02 records node-simconnect metadata as LGPL-3.0-or-later. It remains a candidate, not adopted. LGPL does not automatically require licensing the entire application under GPL. If adopted, review the exact version, licence files, modifications and combined-work distribution under [LGPLv3 sections 2?4](https://www.gnu.org/licenses/lgpl-3.0.html).

Plan to preserve library attribution and GPL/LGPL texts, provide corresponding library source including modifications, and satisfy the applicable combined-work route allowing users to modify/recombine or replace the library. Do not prohibit reverse engineering needed to debug library modifications. Installation information may be required where the licences' conditions apply. A separately replaceable library is potentially simpler than bundling it irreversibly into application code, but JavaScript imports alone do not prove compliance.

Electron bundling, minification, ASAR archives, integrity checks, signing and auto-updates can affect practical library replacement. Test the actual Windows package, retain required build/recombination materials and ensure signatures/update policy do not defeat the chosen compliance route. Approve this plan before adopting the dependency; do not assume a separate utility process removes obligations.

Microsoft SDKs and aircraft/vendor SDKs have separate terms. Inventory exact redistributed files and versions; verify permissions for DLLs, headers, samples, datasets and binaries, attribution/EULA obligations and API usage terms. PRD's PMDG review identifies distribution/EULA questions, not blanket permission. Do not redistribute SDKs or proprietary research artifacts based on availability alone. SimBrief/Hoppie service access and trademarks require their own checks. Third-party code retains its own licence regardless of AutoDispatch's eventual licence.
