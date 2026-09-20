import { describe, it, expect } from 'vitest';
import { SemanticClauseAnalyzer } from '../../src/core/edge-inference/semantic-analyzer';

describe('SemanticClauseAnalyzer (Edge Transformer Heuristics)', () => {
  const analyzer = new SemanticClauseAnalyzer();

  it('formats prompt according to SmolLM2 ChatML template', () => {
    const prompt = analyzer.formatPrompt({
      clauseText: 'Tenant pays all landlord legal fees in any dispute.',
      jurisdiction: 'CA'
    });

    expect(prompt).toContain('<|im_start|>system');
    expect(prompt).toContain('<|im_start|>user');
    expect(prompt).toContain('Analyze this residential lease clause:');
    expect(prompt).toContain('<|im_end|>\n<|im_start|>assistant\n');
  });

  it('detects unconscionable habitability waivers and scores High severity', () => {
    const result = analyzer.analyzeSemanticRisk(
      'c-hab',
      'Tenant accepts unit in AS IS condition and waives any claim regarding habitability.',
      'CA',
      'webgpu',
      38.0
    );

    expect(result.unconscionabilitySeverity).toBe('High');
    expect(result.semanticRiskScore).toBeGreaterThanOrEqual(60);
    expect(result.hiddenWaiversDetected).toContain('Statutory Warranty of Habitability Waiver');
    expect(result.statutoryCorroboration).toContain('CA Civ. Code §§ 1941.1');
    expect(result.aiCounterAmendment).toContain('Landlord covenants and warrants');
  });

  it('detects unilateral exculpatory indemnity clauses and generates balanced mutual counter-amendment', () => {
    const result = analyzer.analyzeSemanticRisk(
      'c-indem',
      'Tenant agrees to indemnify and hold harmless Landlord from any injury or property damage on premises.',
      'NY',
      'wasm',
      24.0
    );

    expect(result.unconscionabilitySeverity).toBe('Moderate');
    expect(result.hiddenWaiversDetected).toContain('Landlord Negligence Exculpatory Clause');
    expect(result.statutoryCorroboration).toContain('NY Real Prop. Law § 235-b');
    expect(result.aiCounterAmendment).toContain('gross negligence, intentional misconduct');
  });

  it('detects entry without notice and drafts 24-hour statutory requirement', () => {
    const result = analyzer.analyzeSemanticRisk(
      'c-entry',
      'Landlord may enter the premises at any time without notice at Landlords sole discretion.',
      'TX',
      'simulated',
      30.0
    );

    expect(result.hiddenWaiversDetected).toContain('Quiet Enjoyment & Statutory Notice Waiver');
    expect(result.aiCounterAmendment).toContain('twenty-four (24) hours advance written notice');
  });

  it('returns Low severity and standard covenant for benign lease clauses', () => {
    const result = analyzer.analyzeSemanticRisk(
      'c-clean',
      'Tenant shall keep the kitchen counters clean and deposit trash in designated community dumpsters.',
      'CA',
      'webgpu',
      38.0
    );

    expect(result.unconscionabilitySeverity).toBe('Low');
    expect(result.semanticRiskScore).toBeLessThanOrEqual(30);
    expect(result.hiddenWaiversDetected).toHaveLength(0);
  });
});
