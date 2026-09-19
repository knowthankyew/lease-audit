# Legal, Privacy, and Third-Party Attribution Notice

**LeaseAudit Studio**  
Copyright © 2026 knowthankyew / The LeaseAudit Contributors  
Repository: [https://github.com/knowthankyew/lease-audit](https://github.com/knowthankyew/lease-audit)

---

## 1. Statutory Educational Tool Notice (Not Legal Advice)

LeaseAudit is an educational statutory reality engine and lease-compliance analysis tool. It evaluates residential lease agreements against published statutory rules and landlord-tenant statutes across California (AB 12 / Civ. Code § 1950.5), New York (HSTPA / Real Prop. Law § 238-a), Texas (Property Code § 92), Florida (Statutes Ch. 83), Illinois (765 ILCS 710), the Federal Servicemembers Civil Relief Act (50 U.S.C. § 3955), and the Fair Housing Act (42 U.S.C. § 3604).

**Important Disclaimers:**
- LeaseAudit is **not a law firm** and its maintainers and contributors are not acting as your legal counsel.
- The generated risk assessments, flagged clauses, statutory citations, and dispute letters are produced strictly for educational and informational purposes.
- Landlord-tenant laws vary significantly by local municipality (including municipal rent control and rent stabilization ordinances).
- Use of this software does not create an attorney-client relationship. If you are facing eviction, unlawful lockout, utility shutoff, or an active legal controversy, please consult a licensed tenant attorney or a qualified legal aid organization.

---

## 2. Consumer Privacy Defaults & Air-Gap Invariant

By default, LeaseAudit is built and distributed with strict, verifiable consumer privacy invariants:

- **100% Client-Side In-Browser Execution:** All PDF/text extraction, clause boundary detection, regex statutory evaluations, and letter generation execute entirely inside your local browser runtime.
- **Zero Remote Network Transmission:** The public consumer application never transmits document contents, lease text, PII, or operational metrics over the network.
- **Volatile In-Memory Observability:** Spans and session audits are retained only in volatile browser memory (`memory_only` mode with `MemoryExporter`).
- **Complete Burnability:** Clicking "Burn Local Data" immediately purges all lease text, analysis results, audit logs, and in-memory telemetry buffers, replacing telemetry with a permanent no-op tombstone.
- **Honest Indicators:** UI indicators and badges honestly report privacy and telemetry state. Unconditional "100% Local" and "Zero Network" claims are derived directly from the active runtime configuration and are never displayed if an external exporter is attached.

---

## 3. Enterprise Observability Mode Notice

Organizations or enterprises building or containerizing LeaseAudit with external OpenTelemetry collectors (`VITE_OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_EXPORTER_OTLP_ENDPOINT`):

- **Unmistakable Visual Indication:** Enterprise builds display a persistent, high-contrast banner across the top of the application, an `[ENTERPRISE]` title badge, and update all UI copy to reflect that an external OTLP exporter is active.
- **Strict Attribute Allowlist (`SAFE_ALLOWLIST_KEYS`):** Even in enterprise mode, raw lease text, document bodies, and unlisted attributes are strictly redacted by default (`[REDACTED_BY_DEFAULT_ALLOWLIST]`). Only verified metadata keys (such as `rule_id`, `clause_count`, `duration_ms`, `grade`, `risk_level`, `status`) may be exported.
- **Document Content Air-Gap:** Document bodies are never exported to external telemetry backends.

---

## 4. Software Bill of Materials (SBOM) & Third-Party Licensure

LeaseAudit incorporates open-source software packages. In accordance with open-source licenses, a complete, machine-readable **CycloneDX Software Bill of Materials** (`bom.json`) is automatically generated on every build in CI using OWASP `@cyclonedx/cdxgen` and attached to release artifacts.

### Key Components & Licenses

| Package / Component | License | Copyright / Maintainer |
| :--- | :--- | :--- |
| **React** | MIT | Copyright © Meta Platforms, Inc. |
| **React DOM** | MIT | Copyright © Meta Platforms, Inc. |
| **Lucide React** | ISC | Copyright © Lucide Contributors |
| **Vite** | MIT | Copyright © 2019-present Evan You & Vite Contributors |
| **TypeScript** | Apache-2.0 | Copyright © Microsoft Corporation |
| **Vitest** | MIT | Copyright © 2021-present Anthony Fu & Vitest Contributors |
| **OpenTelemetry JS API** | Apache-2.0 | Copyright © The OpenTelemetry Authors |
| **OpenTelemetry Semantic Conventions** | Apache-2.0 | Copyright © The OpenTelemetry Authors |

For the root software license terms, refer to [LICENSE](./LICENSE).
