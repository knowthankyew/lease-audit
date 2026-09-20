import { describe, it, expect, beforeEach } from 'vitest';
import { TelemetryManager } from '../../src/core/telemetry';

describe('Edge ML Privacy Telemetry Invariants (Pillar 1 & Pillar 3)', () => {
  let telemetry: TelemetryManager;

  beforeEach(() => {
    telemetry = new TelemetryManager({
      mode: 'memory_only',
      networkEgress: 'deny'
    });
  });

  it('Pillar 3: records edge inference spans strictly with allowlisted keys and scrubs raw prompt text', () => {
    const span = telemetry.startSpan('evaluate_edge_semantic_lora', {
      jurisdiction: 'CA',
      clause_count: 5,
      // Attempted leak of sensitive prompt/clause text
      prompt: 'Confidential lease agreement between Jane Doe and Acme Landlord',
      raw_clause_text: 'Tenant shall pay $4,000 monthly',
      completion: 'AI suggested counter amendment text'
    });

    span.end('OK', {
      duration_ms: 124,
      device: 'webgpu',
      tokens_per_sec: 38.5,
      risk_level: 'High',
      // Further attempted leaks
      snippet: 'Secret unit 4B deposit details'
    });

    const spans = telemetry.getMemorySpans();
    const edgeSpan = spans.find((s) => s.name === 'evaluate_edge_semantic_lora');

    expect(edgeSpan).toBeDefined();
    const attrs = edgeSpan!.attributes;

    // Allowlisted keys should remain intact
    expect(attrs.jurisdiction).toBe('CA');
    expect(attrs.clause_count).toBe(5);
    expect(attrs.duration_ms).toBe(124);
    expect(attrs.device).toBe('webgpu');
    expect(attrs.risk_level).toBe('High');

    // Forbidden keys MUST be fail-closed redacted
    expect(attrs.prompt).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
    expect(attrs.raw_clause_text).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
    expect(attrs.completion).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
    expect(attrs.snippet).toBe('[REDACTED_BY_DEFAULT_ALLOWLIST]');
  });

  it('Pillar 1: burn() immediately purges all buffered edge telemetry events', () => {
    telemetry.recordAuditEvent('edge_inference_started', 'Started edge inference', {
      jurisdiction: 'CA',
      clause_count: 3,
      device: 'webgpu'
    });

    expect(telemetry.getAuditLog().length).toBeGreaterThan(0);

    telemetry.burn();

    expect(telemetry.getAuditLog()).toHaveLength(0);
    expect(telemetry.getMemorySpans()).toHaveLength(0);
  });

  it('Pillar 4: claims confirm zero network egress during edge inference', () => {
    const claims = telemetry.getPrivacyClaims();
    expect(claims.isLocalOnlyHonest).toBe(true);
    expect(claims.isEnterpriseBuild).toBe(false);
    expect(claims.badgeLabel).toBe('Zero Network • Memory-Only');
    expect(claims.dropzoneNotice).toContain('100% Client-Side Local Execution');
  });
});
