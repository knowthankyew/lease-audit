import { describe, it, expect } from 'vitest';
import { RuleEvaluationEngine } from '../../src/core';

describe('Statute Verification Suite', () => {
  const engine = new RuleEvaluationEngine();
  const requiredJurisdictions = ['FED', 'CA', 'NY', 'TX', 'FL', 'IL'];

  it.each(requiredJurisdictions)('verifies %s statute data integrity and citation formatting', (jur) => {
    const data = engine.getJurisdictionRules(jur);
    expect(data).toBeDefined();
    expect(data?.jurisdiction.toUpperCase()).toBe(jur);
    expect(data?.jurisdictionName.length).toBeGreaterThan(0);
    expect(data?.rules.length).toBeGreaterThan(0);

    for (const rule of data!.rules) {
      // 1. Well-formed ID
      expect(rule.id).toBeTruthy();
      expect(rule.id.startsWith(`${jur}-`)).toBe(true);

      // 2. Statute citation marker
      expect(rule.statuteCitation).toBeTruthy();
      const hasLegalCitation = /(?:§|ILCS|U\.S\.C\.|Stat\.|Code|Gen\.\s*Oblig\.|Real\s*Prop\.)/.test(rule.statuteCitation);
      expect(hasLegalCitation).toBe(true);

      // 3. Summary and official URL
      expect(rule.statuteSummary).toBeTruthy();
      expect(rule.officialUrl.startsWith('http')).toBe(true);

      // 4. Trigger patterns compile as valid regex
      expect(rule.triggerPatterns.length).toBeGreaterThan(0);
      for (const pattern of rule.triggerPatterns) {
        expect(() => new RegExp(pattern)).not.toThrow();
      }

      // 5. Dispute template
      expect(rule.disputeTemplate).toBeTruthy();
    }
  });
});
