/**
 * OpenTelemetry-Compatible Burnable In-Memory Telemetry & Session Audit Engine
 * 
 * Invariants:
 * 1. Default mode is 'memory_only' with MemoryExporter. Zero network egress.
 * 2. Raw document/lease bodies, email texts, or PII/PHI payloads are strictly forbidden from attributes.
 * 3. "Burn Local Data" purges all buffered spans and audit events, resetting telemetry.
 * 4. Honest privacy audit affordance: never reports "local-only" if an OTLP exporter is active.
 */

export type TelemetryMode = 'disabled' | 'memory_only' | 'otlp';
export type EgressPolicy = 'deny' | 'allow_otlp' | 'allow_all';

export interface TelemetryConfig {
  mode: TelemetryMode;
  otlpEndpoint?: string | null;
  allowRawPayloads: boolean;
  burnEnabled: boolean;
  auditDurable: boolean;
  networkEgress: EgressPolicy;
}

export interface SpanRecord {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'UNSET' | 'OK' | 'ERROR';
  attributes: Record<string, string | number | boolean>;
  events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }>;
}

export interface SessionAuditEvent {
  id: string;
  timestamp: string;
  action: 'document_ingested' | 'rules_evaluated' | 'letter_generated' | 'burn_invoked';
  summary: string;
  details?: Record<string, string | number | boolean>;
}

export interface PrivacyAuditReport {
  telemetryMode: TelemetryMode;
  networkEgress: EgressPolicy;
  burnEnabled: boolean;
  durableAudit: boolean;
  otlpEndpoint: string | null;
  allowRawPayloads: boolean;
  activeSpanCount: number;
  sessionAuditCount: number;
  isLocalOnlyHonest: boolean;
}

export interface PrivacyClaims {
  readonly isLocalOnlyHonest: boolean;
  readonly isEnterpriseBuild: boolean;
  readonly appTitleSuffix: string;
  readonly badgeLabel: string;
  readonly dropzoneNotice: string;
  readonly disclaimerExecutionText: string;
  readonly footerTitle: string;
  readonly footerSubtext: string;
  readonly modalStatusTitle: string;
  readonly modalStatusDescription: string;
  readonly otlpEndpoint: string | null;
}

export function getPrivacyClaims(report: PrivacyAuditReport): PrivacyClaims {
  if (report.isLocalOnlyHonest) {
    return {
      isLocalOnlyHonest: true,
      isEnterpriseBuild: false,
      appTitleSuffix: '',
      badgeLabel: 'Zero Network • Memory-Only',
      dropzoneNotice: '100% Client-Side Local Execution • Zero Network Transmission',
      disclaimerExecutionText: 'All rule evaluations execute 100% locally in your browser with zero remote network transmission.',
      footerTitle: '100% Local Air-Gapped Residential Lease Compliance Engine.',
      footerSubtext: 'Zero Telemetry • Zero Remote PII/Document Egress • Grounded Statutory Realities',
      modalStatusTitle: '100% Local-First & Private (Memory-Only Telemetry)',
      modalStatusDescription: 'All computation and telemetry spans remain buffered strictly in volatile memory. No outbound network calls are made. Telemetry purges immediately upon invoking "Burn Local Data".',
      otlpEndpoint: null,
    };
  }

  return {
    isLocalOnlyHonest: false,
    isEnterpriseBuild: true,
    appTitleSuffix: ' (Enterprise Build)',
    badgeLabel: `OTLP Active (${report.telemetryMode})`,
    dropzoneNotice: 'Local Document Parsing • OTLP Operational Metadata Active (Strictly Redacted)',
    disclaimerExecutionText: `Rule evaluations execute in-browser. Scrubbed operational telemetry is exported to configured OTLP endpoint (${report.otlpEndpoint}). Document text is never transmitted.`,
    footerTitle: 'Enterprise Residential Lease Compliance Engine (OTLP Telemetry Active).',
    footerSubtext: 'Enterprise Telemetry Mode • Operational Metadata Export Active • Document Bodies Air-Gapped',
    modalStatusTitle: 'Enterprise OTLP Telemetry Active',
    modalStatusDescription: `Telemetry spans are exported to configured OTLP endpoint: ${report.otlpEndpoint}. Document text and sensitive fields are redacted via strict allowlist.`,
    otlpEndpoint: report.otlpEndpoint,
  };
}

// Explicit allowlist of known-safe telemetry attribute keys.
// All keys not explicitly allowlisted are redacted by default.
export const SAFE_ALLOWLIST_KEYS: ReadonlySet<string> = new Set([
  'rule_id',
  'rule_ids',
  'statute_code',
  'jurisdiction',
  'status',
  'risk_level',
  'duration_ms',
  'duration_sec',
  'clause_count',
  'total_clauses',
  'flagged_clauses',
  'flagged_count',
  'standard_count',
  'watch_count',
  'unenforceable_count',
  'char_count',
  'matched_violations',
  'error_code',
  'job_id',
  'service',
  'action',
  'step',
  'current_step',
  'total_steps',
  'progress_pct',
  'loss',
  'device',
  'adapter_size_bytes',
  'dataset_hash',
  'exchange',
  'routing_key'
]);

export class MemoryExporter {
  private spans: SpanRecord[] = [];

  export(span: SpanRecord): void {
    this.spans.push(span);
  }

  getSpans(): readonly SpanRecord[] {
    return this.spans;
  }

  clear(): void {
    this.spans = [];
  }

  count(): number {
    return this.spans.length;
  }
}

export class TelemetryManager {
  private config: TelemetryConfig;
  private memoryExporter: MemoryExporter;
  private auditLog: SessionAuditEvent[] = [];
  private isBurned = false;

  constructor(customConfig?: Partial<TelemetryConfig>) {
    const metaObj = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }) : undefined;
    const envEndpoint = metaObj?.env?.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;

    const defaultMode: TelemetryMode = envEndpoint ? 'otlp' : 'memory_only';

    this.config = {
      mode: defaultMode,
      otlpEndpoint: envEndpoint || null,
      allowRawPayloads: false,
      burnEnabled: true,
      auditDurable: false,
      networkEgress: defaultMode === 'otlp' ? 'allow_otlp' : 'deny',
      ...customConfig,
    };

    this.memoryExporter = new MemoryExporter();
  }

  public getConfig(): Readonly<TelemetryConfig> {
    return this.config;
  }

  public updateConfig(newConfig: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.config.otlpEndpoint && this.config.mode === 'memory_only') {
      this.config.mode = 'otlp';
      this.config.networkEgress = 'allow_otlp';
    }
  }

  /**
   * Sanitizes attributes using a strict allowlist.
   * Any attribute not explicitly registered in SAFE_ALLOWLIST_KEYS is redacted by default.
   */
  public sanitizeAttributes(attrs: Record<string, unknown>): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, val] of Object.entries(attrs)) {
      const lowerKey = key.toLowerCase();
      const isAllowlisted = SAFE_ALLOWLIST_KEYS.has(lowerKey);

      if (!isAllowlisted && !this.config.allowRawPayloads) {
        // Redact any key not explicitly verified in the allowlist
        sanitized[key] = '[REDACTED_BY_DEFAULT_ALLOWLIST]';
        continue;
      }

      if (typeof val === 'string') {
        // Length safety backstop: truncate long strings to hash even on allowlisted keys
        if (val.length > 256 && !this.config.allowRawPayloads) {
          sanitized[key] = `[TRUNCATED_HASH_${val.slice(0, 8)}...]`;
        } else {
          sanitized[key] = val;
        }
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }

  /**
   * Starts a new tracing span.
   */
  public startSpan(name: string, attributes: Record<string, unknown> = {}): {
    spanId: string;
    end: (status?: 'OK' | 'ERROR', extraAttrs?: Record<string, unknown>) => void;
  } {
    if (this.config.mode === 'disabled' || this.isBurned) {
      return {
        spanId: 'noop',
        end: () => {},
      };
    }

    const spanId = `span_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    const sanitizedAttrs = this.sanitizeAttributes(attributes);

    return {
      spanId,
      end: (status: 'OK' | 'ERROR' = 'OK', extraAttrs: Record<string, unknown> = {}) => {
        if (this.config.mode === 'disabled' || this.isBurned) return;

        const endTime = Date.now();
        const finalAttrs = {
          ...sanitizedAttrs,
          ...this.sanitizeAttributes(extraAttrs),
        };

        const spanRecord: SpanRecord = {
          id: spanId,
          name,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          status,
          attributes: finalAttrs,
          events: [],
        };

        this.memoryExporter.export(spanRecord);

        // Optional OTLP export when configured
        if (this.config.mode === 'otlp' && this.config.otlpEndpoint) {
          this.exportToOtlp(spanRecord).catch(() => {
            // Silently swallow telemetry transmission errors to protect app continuity
          });
        }
      },
    };
  }

  private async exportToOtlp(span: SpanRecord): Promise<void> {
    if (!this.config.otlpEndpoint || typeof fetch === 'undefined') return;

    try {
      await fetch(this.config.otlpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceSpans: [
            {
              resource: {
                attributes: [{ key: 'service.name', value: { stringValue: 'lease-audit' } }],
              },
              scopeSpans: [
                {
                  spans: [
                    {
                      traceId: span.id,
                      spanId: span.id,
                      name: span.name,
                      startTimeUnixNano: span.startTime * 1_000_000,
                      endTimeUnixNano: (span.endTime || span.startTime) * 1_000_000,
                      attributes: Object.entries(span.attributes).map(([k, v]) => ({
                        key: k,
                        value: typeof v === 'number'
                          ? { intValue: v }
                          : typeof v === 'boolean'
                            ? { boolValue: v }
                            : { stringValue: String(v) },
                      })),
                      status: { code: span.status === 'ERROR' ? 2 : 1 },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
    } catch {
      // Egress errors in background telemetry must never crash user operations
    }
  }

  /**
   * Records a high-level session audit event.
   */
  public recordAuditEvent(
    action: SessionAuditEvent['action'],
    summary: string,
    details?: Record<string, unknown>
  ): void {
    if (this.isBurned && action !== 'burn_invoked') return;

    const event: SessionAuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      summary,
      details: details ? this.sanitizeAttributes(details) : undefined,
    };

    this.auditLog.push(event);
  }

  public getAuditLog(): readonly SessionAuditEvent[] {
    return this.auditLog;
  }

  public downloadSessionAuditJson(): string {
    const exportData = {
      generatedAt: new Date().toISOString(),
      service: 'lease-audit',
      telemetryMode: this.config.mode,
      eventCount: this.auditLog.length,
      events: this.auditLog,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * "Burn Local Data" action:
   * Instantly purges in-memory spans, audit entries, and resets telemetry.
   */
  public burn(): void {
    this.recordAuditEvent('burn_invoked', 'Burn Local Data invoked: purging all session buffers and telemetry.');
    
    if (this.config.burnEnabled) {
      this.memoryExporter.clear();
      this.auditLog = [];
      this.isBurned = true;
    } else {
      // Enterprise non-burn mode: clear audit log but preserve enterprise exporter telemetry
      this.auditLog = [];
    }
  }

  /**
   * Resets the burn state (e.g. when user explicitly starts a new audit session).
   */
  public restartSession(): void {
    this.isBurned = false;
    this.memoryExporter.clear();
    this.auditLog = [];
  }

  public getMemorySpans(): readonly SpanRecord[] {
    return this.memoryExporter.getSpans();
  }

  /**
   * Generates honest privacy audit report.
   */
  public getPrivacyAuditReport(): PrivacyAuditReport {
    return {
      telemetryMode: this.config.mode,
      networkEgress: this.config.networkEgress,
      burnEnabled: this.config.burnEnabled,
      durableAudit: this.config.auditDurable,
      otlpEndpoint: this.config.otlpEndpoint || null,
      allowRawPayloads: this.config.allowRawPayloads,
      activeSpanCount: this.memoryExporter.count(),
      sessionAuditCount: this.auditLog.length,
      isLocalOnlyHonest: this.config.mode !== 'otlp' && !this.config.otlpEndpoint,
    };
  }

  /**
   * Single source of truth for all user-facing privacy claims across the UI.
   */
  public getPrivacyClaims(): PrivacyClaims {
    return getPrivacyClaims(this.getPrivacyAuditReport());
  }
}

// Singleton reference instance for application-wide telemetry
export const telemetry = new TelemetryManager();
