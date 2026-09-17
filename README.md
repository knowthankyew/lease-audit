# LeaseAudit ⚖️

**100% local, statute-grounded residential lease auditing tool.** Paste or upload a lease to get an instant breakdown of which clauses are enforceable, which are likely illegal in your jurisdiction, and a generated dispute letter — before you sign or before your landlord tries to enforce something they shouldn't.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![.NET 10](https://img.shields.io/badge/.NET-10.0-purple.svg)](https://dotnet.microsoft.com/)
[![Local-First](https://img.shields.io/badge/Privacy-100%25%20Air--Gapped-success.svg)](#privacy--air-gap-guarantee)
[![WCAG AA](https://img.shields.io/badge/A11y-WCAG%20AA%20Compliant-brightgreen.svg)](#accessibility)

---

## The Problem

Most renters never read their lease closely, and even when they do, they have no way to tell "standard boilerplate" from "clause my landlord cannot legally enforce." Landlord-tenant law is a patchwork of federal protections (Fair Housing Act, Servicemembers Civil Relief Act) and divergent state statutes (security deposit caps, 14-to-30 day return deadlines, late fee caps, notice-to-enter rules, self-help lockout prohibitions).

Property management companies rely on this information asymmetry. **LeaseAudit removes it.**

---

## Core Flow

1. **Ingest:** Paste raw lease text or drop a file (`.pdf`, `.docx`, `.txt`).
2. **Local Extraction:** In-process text parsing with zero cloud calls and zero PII egress.
3. **Clause Segmentation:** Heuristic boundary detection breaks the agreement into discrete clauses.
4. **Statute Evaluation:** Clauses are checked against verified statutory rules (Federal + 5 core states) and classified:
   - 🟢 **Standard:** Standard terms compliant with statutory baselines.
   - 🟡 **Watch:** Ambiguous or bordering provisions requiring attention.
   - 🔴 **Likely Unenforceable:** Clauses conflicting with state or federal statutory mandates.
5. **Dispute Letter Generation:** Instantly drafts an assertive, plain-English letter citing specific code sections (Pre-Signing Amendment Request or Tenancy Dispute Notice).
6. **Burn Local Data:** One-click button immediately purges all memory, DOM state, and backend buffers.

---

## Quickstart (Zero-Config)

```bash
# Clone the repository
git clone https://github.com/knowthankyew/lease-audit.git
cd lease-audit

# Launch (builds, starts local Kestrel server, opens default browser)
./start.sh
```

By default, LeaseAudit runs on `http://localhost:5173`.

---

## Statute Coverage (MVP Scope)

Every single rule in LeaseAudit is grounded in official, verified statutes:

| Jurisdiction | Code | Covered Topics & Statutory Citations | Official Source |
| :--- | :--- | :--- | :--- |
| **Federal** | `FED` | - **42 U.S.C. § 3604(a):** Fair Housing Act familial status discrimination.<br>- **42 U.S.C. § 3604(f)(3)(B):** Service & emotional support animal protections.<br>- **50 U.S.C. § 3955:** Servicemembers Civil Relief Act (SCRA) early termination rights.<br>- **42 U.S.C. § 4852d:** Residential Lead-Based Paint Hazard Reduction Act. | [US Code](https://www.law.cornell.edu/uscode/text) |
| **California** | `CA` | - **Cal. Civ. Code § 1950.5(c):** Security deposit cap (1 month max rent per AB 12).<br>- **Cal. Civ. Code § 1950.5(g):** 21-day itemized deposit return timeline.<br>- **Cal. Civ. Code § 1954:** 24-hour written notice required prior to entry.<br>- **Cal. Civ. Code § 789.3:** Self-help eviction & lockout ban ($100/day statutory damages).<br>- **Cal. Civ. Code § 1941.1 & § 1942.1:** Implied warranty of habitability (non-waivable).<br>- **Cal. Civ. Code § 1671:** Late fees liquidated damages & reasonableness standard. | [California Legislative Information](https://leginfo.legislature.ca.gov) |
| **New York** | `NY` | - **N.Y. Gen. Oblig. Law § 7-108(1-a)(a):** 1-month security deposit cap (HSTPA).<br>- **N.Y. Gen. Oblig. Law § 7-108(1-a)(e):** 14-day itemized deposit return (forfeiture penalty).<br>- **N.Y. Real Prop. Law § 238-a(2):** Late fees capped at $50 or 5% after 5-day grace period.<br>- **N.Y. Real Prop. Law § 768:** Unlawful eviction & lockout criminalization (Class A misdemeanor).<br>- **N.Y. Real Prop. Law § 235-b:** Statutory warranty of habitability (non-waivable).<br>- **N.Y. Real Prop. Law § 235-f:** Roommate Law (unlawful restrictions on occupancy). | [New York State Senate](https://www.nysenate.gov/legislation/laws) |
| **Texas** | `TX` | - **Tex. Prop. Code § 92.103:** 30-day security deposit return timeline.<br>- **Tex. Prop. Code § 92.019:** Mandatory 2 full days grace period; statutory late fee caps.<br>- **Tex. Prop. Code § 92.0081:** Prohibition of unlawful tenant exclusion & lockouts.<br>- **Tex. Prop. Code § 92.008:** Prohibition of utility interruption for rent delinquency.<br>- **Tex. Prop. Code § 92.056 & § 92.006:** Non-waivable landlord repair obligations. | [Texas Constitution and Statutes](https://statutes.capitol.texas.gov/) |
| **Florida** | `FL` | - **Fla. Stat. § 83.49(3)(a):** 15-day return / 30-day notice for deposit damage claims.<br>- **Fla. Stat. § 83.53(2):** 24-hour notice of entry for repairs (Miya's Law).<br>- **Fla. Stat. § 83.67:** Prohibited landlord practices (utility termination, lockouts).<br>- **Fla. Stat. § 83.51 & § 83.47:** Non-waivable landlord duty to maintain premises. | [Online Sunshine](http://www.leg.state.fl.us/statutes/) |
| **Illinois** | `IL` | - **765 ILCS 710/1:** Security Deposit Return Act (30-day itemization, 45-day return).<br>- **765 ILCS 715/1:** Security Deposit Interest Act for buildings with 25+ units.<br>- **735 ILCS 5/9-101 et seq.:** Forcible Entry and Detainer Act (exclusive court remedy; self-help banned).<br>- **765 ILCS 720/1:** Retaliatory eviction and code reporting protection. | [Illinois General Assembly](https://www.ilga.gov/legislation/ilcs/ilcs.asp) |

*See [docs/statutes.md](docs/statutes.md) for the complete statutory audit trace, legislative history, and official citations.*

---

## Privacy & Air-Gap Guarantee

- **Zero Cloud Ingestion:** Document parsing (PDF with managed `PdfPig`, Word documents with `DocumentFormat.OpenXml`) executes entirely within the local process.
- **No IP Geolocation:** Users manually pick their jurisdiction from the dropdown. The application never queries geolocation services or IP lookups.
- **Burn Local Data:** Clicking the "Burn Local Data" button immediately flushes browser state, clears the DOM, resets all form inputs, and signals the backend (`POST /api/privacy/purge`) to perform immediate garbage collection.

---

## Graceful Sidecar Pairing (`event-driven-ftaas`)

LeaseAudit is **fully functional standalone** using deterministic regex and heading heuristics. If an instance of `event-driven-ftaas` or a compatible local model sidecar is active at `http://localhost:8000`, LeaseAudit silently upgrades clause classification quality without errors, timeouts, or UI warnings if it is absent.

---

## Accessibility (Day 1 Compliance)

- **Landmarks & Semantics:** HTML5 landmarks (`header`, `main`, `footer`, `section`, `article`).
- **Live Regions:** Screen reader announcers (`aria-live="polite"`) broadcast document extraction progress, audit completion stats, and dispute actions.
- **Full Keyboard Navigation:** All controls, filter pills, dropzones, and clause cards respond to `Tab`, `Enter`, and `Space`.
- **Focus Trapping & Restoration:** Dispute letter modal traps focus while open and restores focus to the trigger button upon dismissal.
- **Media Queries:** Full native support for `@media (prefers-reduced-motion: reduce)` and `@media (prefers-contrast: more)`.
- **Contrast:** High-contrast obsidian theme tokens verified against WCAG AA standards.

---

## Testing & Verification

### xUnit Backend & Rule Verification Suite
```bash
dotnet test
```
Tests cover:
- Document normalization and heading segmentation.
- Boundary detection across complex residential leases.
- Full statutory citation verification (ensuring every rule has an official legal citation and valid regex pattern).
- High-risk clause detection for California, New York, Texas, Florida, Illinois, and Federal rules.

### Playwright End-to-End Suite
```bash
cd tests/LeaseAudit.E2E
npm install
npx playwright test
```

---

## Legal Disclaimer

> [!IMPORTANT]
> **LeaseAudit is an educational tool and does not provide legal advice.**
> Landlord-tenant laws vary by jurisdiction, municipality (e.g., local rent control ordinances), and specific lease facts. Reviewing a lease with LeaseAudit does not create an attorney-client relationship. If you are facing eviction, unlawful lockouts, or an active legal dispute, contact a licensed tenant attorney or your local legal aid society.

---

## License

MIT © 2026 Courtlandt Harris. See [LICENSE](LICENSE) for details.
