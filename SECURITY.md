# Security policy

There is no released application or supported application version yet. Repository/workflow vulnerabilities are in scope; vendor problems should also follow the vendor's reporting process.

Do not put vulnerabilities, tokens or exploitable private details in public issues. Where available, use the repository Security tab ? Report a vulnerability for a private advisory. Private vulnerability reporting must be enabled by the maintainer before public launch. If unavailable, contact the maintainer through the contact options on their GitHub profile and request a private reporting channel before sharing details. No dedicated email or response SLA is promised.

Include affected revision, impact, minimal reproduction and sanitised evidence. Maintainer triages privately, coordinates fixes/disclosure with the reporter and credits only with consent.

Never commit Navigraph refresh/access tokens, Hoppie keys, simulator credentials, signing keys, personal OFPs or unredacted diagnostics. Use synthetic fixtures. Exclusions reduce accidents but do not remove tracked secrets: revoke exposed credentials immediately and coordinate history cleanup. Keep CI secrets out of fork PRs. Workflows use read-only permissions by default, pinned actions and no privileged execution of contribution code. Review lockfile and workflow changes carefully; dependency audit is not comprehensive secret or application security scanning.

Future Electron security requirements are in docs/architecture/boundaries.md. CodeQL and application scanning start when supported source exists. Enable GitHub secret scanning/push protection where the repository plan supports them; do not claim they are active without verification.
