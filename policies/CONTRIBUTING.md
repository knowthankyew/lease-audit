# Contributing Statutory Tenancy Policies to Lease-Audit

Welcome! Legal aid organizations, tenant attorneys, and civic contributors can contribute state and municipal landlord-tenant regulations to Lease-Audit without writing or modifying any TypeScript code.

## How to Add or Update a Jurisdiction

1. **Locate or Create the Policy File**:
   - Files are stored in `policies/jurisdictions/<STATE_CODE>.json` (e.g. `policies/jurisdictions/WA.json` for Washington).
   - If adding a new jurisdiction, copy `policies/templates/jurisdiction-template.json` to `policies/jurisdictions/<STATE_CODE>.json`.

2. **Update the Fields**:
   - `jurisdiction`: Two-letter state or municipal code (e.g., `"WA"`).
   - `jurisdictionName`: Full name (e.g., `"Washington"`).
   - `statuteVersion`: Year and revision (e.g., `"2026.1"`).
   - `lastAudited`: Date of statutory verification (`YYYY-MM-DD`).
   - `officialSourceUrl`: Official state legislative codes link.
   - `rules`: Array of rule items. Each rule requires:
     - `id`: Unique identifier (e.g., `"WA-SEC-DEP-01"`).
     - `category`: One of `SecurityDeposit`, `LateFees`, `EntryNotice`, `HabitabilityRepairs`, `EvictionLockout`, `TerminationRenewal`, `Disclosures`, `General`.
     - `name`: Human-readable clause issue name.
     - `severity`: `LikelyUnenforceable`, `Watch`, or `Standard`.
     - `statuteCitation`: Official legal citation (e.g., `"RCW 59.18.280"`).
     - `statuteSummary`: Plain-language explanation of what the law requires or forbids.
     - `officialUrl`: Direct URL to the statute section.
     - `triggerPatterns`: Array of case-insensitive regular expressions that identify the unlawful clause.
     - `contraIndicatorPatterns`: Array of expressions that negate the violation (e.g. exceptions or compliant phrasing).
     - `disputeTemplate`: Suggested counter-amendment or legal dispute notice language for the tenant.

3. **Validate Your Changes**:
   ```bash
   npm run validate:policies
   ```

4. **Submit a Pull Request**:
   Open a PR against `main`. Automated CI will validate your policy against the schema.
