<!-- diagram-meta
  last-validated: 2026-10-26
  validated-commit: 84672cd
  covers: [src/**, contracts/**]
  generated-by: manual
-->

# Architecture & Invariants Specification: Lease Audit Reality Engine

> Client-side residential lease agreement analyzer, statutory clause auditor, and tenant rights dispute generator.

---

## 1. Executive Summary

`lease-audit` is a client-side reality engine in the `knowthankyew` portfolio dedicated to residential lease agreements. It analyzes leases against state statutory protections (such as California AB 12 deposit limits, New York HSTPA, Texas Property Code Ch. 92, and Illinois 765 ILCS), flagging unlawful clauses (e.g., blanket repair waivers, illegal deposit deductions, unauthorized entry clauses, retaliatory eviction waivers) and synthesizing formal tenant dispute letters entirely in client memory.

---

## 2. System Architecture & Component Interactions

### A. Execution Sandbox & Trust Boundary

```mermaid
flowchart LR
    subgraph ClientEnvironment["Client Browser Sandbox (Air-Gapped)"]
        User["👤 Tenant / Reviewer"]
        
        subgraph Ingestion["1. Ingestion Layer"]
            Dropzone["📄 File Dropzone / Paste<br/><i>(Plain Text / PDF)</i>"]
            Handoff["🔗 Handoff Adapter<br/><i>(From Extension)</i>"]
            Segmenter["✂️ Segmenter & Normalizer<br/><code>src/core/segmenter.ts</code>"]
        end

        subgraph Engine["2. Local Evaluation Core"]
            RuleEngine["⚡ Rule Engine<br/><code>src/core/rule-engine.ts</code>"]
            PolicyPack["📦 @knowthankyew/policy-packs/tenancy<br/><i>(CA, NY, TX, FL, IL Statutes)</i>"]
            DisputeGen["📝 Dispute Letter Generator<br/><code>src/core/dispute-generator.ts</code>"]
        end

        subgraph Presentation["3. React 19 UI & Controls"]
            Report["📊 Audit Report & Findings Cards"]
            LetterView["📜 Generated Legal Letter View"]
            PrivacyModal["🛡️ Privacy Audit Modal"]
            BurnCtrl["🔥 Hard Burn Controller"]
        end

        subgraph TelemetryStore["4. Volatile Telemetry"]
            TelemBuffer["🧠 In-Memory Circular Buffer<br/><i>(Zero Network Egress)</i>"]
        end
    end

    %% Data Flow
    User -->|"Uploads Lease / Text"| Dropzone
    Handoff -->|"Pre-fills Clauses"| Segmenter
    Dropzone -->|"Raw Content"| Segmenter
    Segmenter -->|"Normalized Clauses"| RuleEngine
    PolicyPack -.->|"Statutory Rules & Regexes"| RuleEngine
    RuleEngine -->|"Flagged Violations"| Report
    RuleEngine -->|"Violations with Statutory Citations"| DisputeGen
    DisputeGen --> LetterView
    Report -->|"Render Findings"| User
    LetterView -->|"Copy / Export Letter"| User

    %% Telemetry & Burn
    RuleEngine -.->|"Allowlisted Spans"| TelemBuffer
    TelemBuffer -.->|"Inspect Real-Time Events"| PrivacyModal
    BurnCtrl -->|"Purges Memory & DOM State"| TelemBuffer
    BurnCtrl -->|"Wipes Document State"| Segmenter

    classDef client fill:#0f172a,stroke:#64748b,stroke-width:1px,color:#f8fafc;
    classDef comp fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef pkg fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#f8fafc;
    classDef burn fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;

    class Dropzone,Handoff,Segmenter,RuleEngine,DisputeGen,Report,LetterView,PrivacyModal comp;
    class PolicyPack pkg;
    class TelemBuffer,BurnCtrl burn;
```

### B. Audit & Remediation Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as Tenant / User
    participant UI as React UI (App.tsx)
    participant Core as Segmenter & RuleEngine
    participant Tenancy as Policy Packs (Tenancy)
    participant Disp as Dispute Generator
    participant Telem as Telemetry Buffer

    Tenant->>UI: Drop lease document or paste text
    UI->>Core: segment(rawText)
    Core->>Core: Normalize whitespace & clause boundaries
    Core->>Tenancy: Load jurisdiction rules (e.g. CA AB 12, NY HSTPA)
    loop For each lease clause
        Core->>Tenancy: Test patterns (deposit caps, waivers, entry)
        Tenancy-->>Core: Match result (statuteRef, severity, remedy)
    end
    Core-->>UI: Return categorized findings
    UI->>Telem: Record scan metric (clause_count, duration_ms)
    UI-->>Tenant: Render interactive audit findings

    Tenant->>UI: Click "Generate Dispute Notice"
    UI->>Disp: buildLetter(violations, jurisdiction)
    Disp-->>UI: Formatted statutory dispute letter
    UI-->>Tenant: Render editable letter with citations

    Tenant->>UI: Click "Burn Local Data"
    UI->>Telem: Purge circular buffer
    UI->>Core: Dereference document & clause strings
    UI-->>Tenant: Display clean amnesiac state
```

---

## 3. Core Architectural Invariants

| # | Invariant | Enforcement & Guarantee |
|:--|:----------|:------------------------|
| 1 | **Zero Document Egress** | Leases and PII never leave the client browser. No backend API, analytics beacon, or external storage exists. |
| 2 | **Volatile Memory Telemetry** | Operational events are held strictly in an in-memory ring buffer for the local privacy modal; zero network export in consumer builds. |
| 3 | **Strict Key Allowlists** | Telemetry sanitizes properties against `SAFE_ALLOWLIST_KEYS`; raw lease text, names, and rental addresses are redacted. |
| 4 | **Compile-Time Dead Code Shims** | Enterprise OTLP exporter symbols are dead-code excised at build time in standard consumer builds. |
| 5 | **Amnesiac State Purge (Hard Burn)** | Instantaneous dereferencing and buffer reset returning the application to an uncontaminated initial state. |

---

## 4. Directory Structure

```
lease-audit/
├── docs/
│   ├── ARCHITECTURE.md          # Architecture, data flow & invariant specification
│   ├── PRIVACY_TELEMETRY_SCHEMA.md # Telemetry contract specification
│   └── statutes.md              # Statutory grounding & legal references
├── src/
│   ├── App.tsx                  # Root application view & workflow orchestration
│   ├── main.tsx                 # Entrypoint
│   ├── components/              # UI components (Dropzone, AuditReport, DisputeLetter, BurnModal)
│   ├── contracts/               # TypeScript interfaces & handoff contracts
│   ├── core/
│   │   ├── segmenter.ts         # Document parser & clause boundary detector
│   │   ├── normalizer.ts        # Text normalization & whitespace cleanup
│   │   ├── rule-engine.ts       # Statutory evaluation engine
│   │   ├── dispute-generator.ts # Statutory letter generator citing legal codes
│   │   ├── handoff-adapter.ts   # Structured Handoff from knowthankyew-extension
│   │   └── telemetry.ts         # In-memory privacy telemetry controller
│   └── data/                    # Fallback statutory datasets & sample leases
├── tests/                       # Vitest unit & ReDoS test suites
└── vite.config.ts               # Air-gapped bundler configuration
```
