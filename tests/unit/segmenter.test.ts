import { describe, it, expect } from 'vitest';
import { ClauseSegmenter, normalizeText, detectCategory } from '../../src/core';
import { SAMPLE_LEASES } from '../../src/data';

describe('ClauseSegmenter & Normalizer', () => {
  const segmenter = new ClauseSegmenter();

  it('normalizes smart quotes, dashes, and redundant newlines', () => {
    const messy = "“Smart quotes” and ‘single’ and — dashes — \r\n\r\n\r\n\r\nfour breaks";
    const cleaned = normalizeText(messy);

    expect(cleaned).toContain('"Smart quotes"');
    expect(cleaned).toContain("'single'");
    expect(cleaned).toContain('- dashes -');
    expect(cleaned).not.toContain('\r');
    expect(cleaned).not.toContain('\n\n\n');
  });

  it('segments California lease and categorizes clauses', () => {
    const caLease = SAMPLE_LEASES.ca.text;
    const clauses = segmenter.segment(caLease);

    expect(clauses.length).toBeGreaterThanOrEqual(7);

    // Assert key categories are identified
    expect(clauses.some((c) => c.category === 'SecurityDeposit')).toBe(true);
    expect(clauses.some((c) => c.category === 'LateFees')).toBe(true);
    expect(clauses.some((c) => c.category === 'EntryNotice')).toBe(true);
    expect(clauses.some((c) => c.category === 'HabitabilityRepairs')).toBe(true);
    expect(clauses.some((c) => c.category === 'EvictionLockout')).toBe(true);

    const secDep = clauses.find((c) => c.category === 'SecurityDeposit');
    expect(secDep?.sectionNumber).toBe('3');
    expect(secDep?.title).toBe('SECURITY DEPOSIT');
  });

  it('segments New York lease and captures numbered headers', () => {
    const nyLease = SAMPLE_LEASES.ny.text;
    const clauses = segmenter.segment(nyLease);

    expect(clauses.length).toBeGreaterThanOrEqual(6);

    const depositClause = clauses.find((c) => c.category === 'SecurityDeposit');
    expect(depositClause).toBeDefined();
    expect(depositClause?.rawText).toContain('6,400');
  });

  it('returns empty list for empty or whitespace text', () => {
    expect(segmenter.segment('')).toEqual([]);
    expect(segmenter.segment('   \n\n\t  ')).toEqual([]);
  });

  it('detects categories accurately via keyword heuristics', () => {
    expect(detectCategory('Tenant shall pay a late fee of $50.')).toBe('LateFees');
    expect(detectCategory('Landlord may change door locks upon non-payment.')).toBe('EvictionLockout');
    expect(detectCategory('Security deposit balance will be refunded within 21 days.')).toBe('SecurityDeposit');
    expect(detectCategory('Landlord must provide 24 hours notice before entering.')).toBe('EntryNotice');
    expect(detectCategory('Tenant accepts premises in as-is condition and waives habitability.')).toBe('HabitabilityRepairs');
  });
});
