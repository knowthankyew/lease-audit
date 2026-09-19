import { describe, it, expect, beforeEach } from 'vitest';
import { TelemetryManager } from '../../src/core/telemetry';

describe('TelemetryManager & Privacy Invariants', () => {
  let tm: TelemetryManager;

  beforeEach(() => {
    tm = new TelemetryManager({
      mode: 'memory_only',
      otlpEndpoint: null,
      burnEnabled: true,
      allowRawPayloads: false,
      auditDurable: false,
      networkEgress: 'deny',
    });
  });

  it('initializes in memory_only mode with zero network egress', () => {
    const report = tm.getPrivacyAuditReport();
    expect(report.telemetryMode).toBe('memory_only');
    expect(report.networkEgress).toBe('deny');
    expect(report.otlpEndpoint).toBeNull();
    expect(report.isLocalOnlyHonest).toBe(true);
    expect(report.activeSpanCount).toBe(0);
  });

  it('records spans in MemoryExporter and calculates duration', () => {
    const span = tm.startSpan('segment_clauses', { clause_count: 12 });
    span.end('OK', { duration_ms: 15 });

    const spans = tm.getMemorySpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('segment_clauses');
    expect(spans[0].status).toBe('OK');
    expect(spans[0].attributes.clause_count).toBe(12);
  });

  it('strictly redacts any attribute not registered in the safe allowlist', () => {
    const span = tm.startSpan('audit_evaluation', {
      rule_id: 'CA_CIV_1950_5',
      lease_text: 'TENANT MUST SURRENDER DEPOSIT IMMEDIATELY',
      raw_payload: 'SECRET CONFIDENTIAL LEASE CONTENT',
      matchedText: 'short 40 char snippet of sensitive text',
      excerpt: 'another clause excerpt',
      snippet: 'landlord demands immediate entry without notice',
      flagged_count: 2,
    });
    span.end('OK');

    const spans = tm.getMemorySpans();
    expect(spans).toHaveLength(1);
    const attrs = spans[0].attributes;

    // Allowlisted keys pass through
    expect(attrs.rule_id).toBe('CA_CIV_1950_5');
    expect(attrs.flagged_count).toBe(2);

    // Non-allowlisted keys are strictly redacted by default
    expect(attrs.lease_text).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
    expect(attrs.raw_payload).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
    expect(attrs.matchedText).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
    expect(attrs.excerpt).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
    expect(attrs.snippet).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
  });

  it('purges all in-memory spans and session audit logs upon burn()', () => {
    const span1 = tm.startSpan('parse_document', { doc_length: 500 });
    span1.end('OK');

    tm.recordAuditEvent('document_ingested', 'Ingested 500 characters', { char_count: 500 });

    expect(tm.getMemorySpans().length).toBe(1);
    expect(tm.getAuditLog().length).toBe(1);

    // Invoke Burn Local Data
    tm.burn();

    expect(tm.getMemorySpans().length).toBe(0);
    expect(tm.getAuditLog().length).toBe(0);

    // Subsequent span attempts remain no-op until restart
    const spanAfterBurn = tm.startSpan('post_burn_op', { count: 1 });
    spanAfterBurn.end('OK');
    expect(tm.getMemorySpans().length).toBe(0);
  });

  it('generates downloadable session audit JSON', () => {
    tm.recordAuditEvent('document_ingested', 'Lease ingested', { jurisdiction: 'CA' });
    tm.recordAuditEvent('rules_evaluated', 'Evaluated 12 statutes', { matched_violations: 3 });

    const jsonStr = tm.downloadSessionAuditJson();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.service).toBe('lease-audit');
    expect(parsed.eventCount).toBe(2);
    expect(parsed.events[0].action).toBe('document_ingested');
    expect(parsed.events[1].action).toBe('rules_evaluated');
    expect(parsed.events[1].details.matched_violations).toBe(3);
  });

  it('honestly reports observability status when OTLP is active', () => {
    tm.updateConfig({
      mode: 'otlp',
      otlpEndpoint: 'https://otel.enterprise.internal/v1/traces',
      networkEgress: 'allow_otlp',
    });

    const report = tm.getPrivacyAuditReport();
    expect(report.telemetryMode).toBe('otlp');
    expect(report.otlpEndpoint).toBe('https://otel.enterprise.internal/v1/traces');
    // Must NOT claim local-only when exporting to enterprise OTLP collector
    expect(report.isLocalOnlyHonest).toBe(false);
  });

  it('respects privacy.burn_enabled: false by preserving enterprise telemetry buffers', () => {
    const enterpriseTm = new TelemetryManager({
      mode: 'otlp',
      burnEnabled: false,
    });

    const span = enterpriseTm.startSpan('enterprise_job', { job_id: 'job-123' });
    span.end('OK');

    enterpriseTm.burn();

    // Span buffer is retained for enterprise telemetry exporter
    expect(enterpriseTm.getMemorySpans().length).toBe(1);
    // But UI audit log is cleared
    expect(enterpriseTm.getAuditLog().length).toBe(0);
  });

  it('provides single source of truth for consumer privacy claims (no false local-only claims in enterprise mode)', () => {
    // 1. Consumer defaults
    const consumerClaims = tm.getPrivacyClaims();
    expect(consumerClaims.isLocalOnlyHonest).toBe(true);
    expect(consumerClaims.isEnterpriseBuild).toBe(false);
    expect(consumerClaims.badgeLabel).toBe('Zero Network • Memory-Only');
    expect(consumerClaims.dropzoneNotice).toContain('100% Client-Side Local Execution');
    expect(consumerClaims.disclaimerExecutionText).toContain('100% locally');
    expect(consumerClaims.footerTitle).toContain('100% Local Air-Gapped');

    // 2. Enterprise mode escalation
    tm.updateConfig({
      mode: 'otlp',
      otlpEndpoint: 'https://collector.corp.internal:4318/v1/traces',
      networkEgress: 'allow_otlp',
    });

    const enterpriseClaims = tm.getPrivacyClaims();
    expect(enterpriseClaims.isLocalOnlyHonest).toBe(false);
    expect(enterpriseClaims.isEnterpriseBuild).toBe(true);
    expect(enterpriseClaims.badgeLabel).toBe('OTLP Active (otlp)');
    expect(enterpriseClaims.appTitleSuffix).toBe(' (Enterprise Build)');
    // Must NOT contain unconditional zero-network claims
    expect(enterpriseClaims.dropzoneNotice).not.toContain('Zero Network');
    expect(enterpriseClaims.disclaimerExecutionText).not.toContain('zero remote network transmission');
    expect(enterpriseClaims.footerTitle).not.toContain('Air-Gapped');
    expect(enterpriseClaims.dropzoneNotice).toContain('OTLP Operational Metadata Active');
  });
});
