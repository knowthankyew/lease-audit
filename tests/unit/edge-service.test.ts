import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeInferenceService } from '../../src/core/edge-inference/edge-service';

describe('EdgeInferenceService (Phase 3 FTaaS Bridge)', () => {
  let service: EdgeInferenceService;

  beforeEach(() => {
    service = new EdgeInferenceService();
  });

  it('initializes in ready state with simulated/wasm provider in node environment', async () => {
    expect(service.getStatus()).toBe('uninitialized');
    await service.initialize();
    expect(service.getStatus()).toBe('ready');
    expect(['wasm', 'simulated', 'webgpu']).toContain(service.getExecutionProvider());
    expect(service.getThroughput()).toBeGreaterThan(15);
  });

  it('notifies status listeners upon initialization and status changes', async () => {
    const statuses: string[] = [];
    service.addStatusListener((status) => {
      statuses.push(status);
    });

    await service.initialize();
    expect(statuses).toContain('loading');
    expect(statuses).toContain('ready');
  });

  it('analyzes a clause semantically and returns valid analysis result', async () => {
    const result = await service.analyzeClause(
      'clause-hab-1',
      'Tenant accepts premises AS-IS and waives landlord obligation to maintain habitability or repair defects.',
      'CA'
    );

    expect(result.clauseId).toBe('clause-hab-1');
    expect(result.semanticRiskScore).toBeGreaterThanOrEqual(60);
    expect(result.unconscionabilitySeverity).toBe('High');
    expect(result.hiddenWaiversDetected).toContain('Statutory Warranty of Habitability Waiver');
    expect(result.aiCounterAmendment).toBeTruthy();
    expect(result.tokensGenerated).toBeGreaterThan(0);
    expect(result.tokensPerSec).toBeGreaterThan(0);
  });

  it('caches results for identical clauseId', async () => {
    const res1 = await service.analyzeClause('c1', 'Standard quiet enjoyment clause.', 'NY');
    const res2 = await service.analyzeClause('c1', 'Different text should be cached.', 'NY');
    expect(res1).toBe(res2);
  });

  it('batch analyzes multiple clauses sequentially', async () => {
    const clauses = [
      { id: 'b1', rawText: 'Tenant waives 24-hour notice of entry.' },
      { id: 'b2', rawText: 'Tenant holds landlord harmless for landlord negligence.' }
    ];

    const results = await service.batchAnalyzeClauses(clauses, 'CA');
    expect(results.size).toBe(2);
    expect(results.get('b1')?.hiddenWaiversDetected).toContain('Quiet Enjoyment & Statutory Notice Waiver');
    expect(results.get('b2')?.hiddenWaiversDetected).toContain('Landlord Negligence Exculpatory Clause');
  });

  it('Pillar 1 Invariant: burn() immediately terminates service, purges cache, and rejects future calls', async () => {
    await service.analyzeClause('c-burn', 'Clause text to be burned.', 'CA');
    expect(service.getCachedResult('c-burn')).toBeDefined();

    service.burn();

    expect(service.getStatus()).toBe('terminated');
    expect(service.getCachedResult('c-burn')).toBeUndefined();

    await expect(
      service.analyzeClause('c-new', 'Another clause.', 'CA')
    ).rejects.toThrow('Edge ML runtime has been burned and terminated.');
  });

  it('concurrency: supports simultaneous analyzeClause calls without overwriting or hanging', async () => {
    const promises = [
      service.analyzeClause('concurrent-1', 'Premises taken as is without warranty.', 'CA'),
      service.analyzeClause('concurrent-2', 'Tenant waives right to jury trial in all disputes.', 'NY'),
      service.analyzeClause('concurrent-3', 'Landlord may enter premises at any time without notice.', 'TX'),
    ];

    const results = await Promise.all(promises);
    expect(results).toHaveLength(3);
    expect(results[0].clauseId).toBe('concurrent-1');
    expect(results[0].hiddenWaiversDetected).toContain('Statutory Warranty of Habitability Waiver');
    expect(results[1].clauseId).toBe('concurrent-2');
    expect(results[1].hiddenWaiversDetected).toContain('Right to Jury Trial Waiver');
    expect(results[2].clauseId).toBe('concurrent-3');
    expect(results[2].hiddenWaiversDetected).toContain('Quiet Enjoyment & Statutory Notice Waiver');
  });
});
