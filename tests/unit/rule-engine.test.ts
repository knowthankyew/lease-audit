import { describe, it, expect } from 'vitest';
import { ClauseSegmenter, RuleEvaluationEngine } from '../../src/core';
import { SAMPLE_LEASES } from '../../src/data';
import { Clause } from '../../src/contracts';

describe('RuleEvaluationEngine', () => {
  const segmenter = new ClauseSegmenter();
  const engine = new RuleEvaluationEngine();

  it('evaluates California lease and flags predatory clauses (AB 12, entry, lockout, habitability)', () => {
    const clauses = segmenter.segment(SAMPLE_LEASES.ca.text);
    const result = engine.evaluate(clauses, 'CA');

    expect(result.jurisdiction).toBe('CA');
    expect(result.summary.riskLevel).toBe('High');
    expect(result.summary.unenforceableCount).toBeGreaterThanOrEqual(3);

    // 1. Security deposit: 2 months rent + 60 days
    const deposit = result.clauses.find((c) => c.category === 'SecurityDeposit');
    expect(deposit).toBeDefined();
    expect(deposit?.status).toBe('LikelyUnenforceable');
    expect(deposit?.statuteCitation).toContain('1950.5');

    // 2. Right of entry: at any time without notice
    const entry = result.clauses.find((c) => c.category === 'EntryNotice');
    expect(entry).toBeDefined();
    expect(entry?.status).toBe('LikelyUnenforceable');
    expect(entry?.statuteCitation).toContain('1954');

    // 3. Lockout / self-help
    const lockout = result.clauses.find((c) => c.category === 'EvictionLockout');
    expect(lockout).toBeDefined();
    expect(lockout?.status).toBe('LikelyUnenforceable');
    expect(lockout?.statuteCitation).toContain('789.3');

    // 4. Habitability: as-is waiver
    const habitability = result.clauses.find((c) => c.category === 'HabitabilityRepairs');
    expect(habitability).toBeDefined();
    expect(habitability?.status).toBe('LikelyUnenforceable');
    expect(habitability?.statuteCitation).toContain('1941.1');
  });

  it('evaluates New York lease and flags HSTPA deposit, late fee, and self-help locks', () => {
    const clauses = segmenter.segment(SAMPLE_LEASES.ny.text);
    const result = engine.evaluate(clauses, 'NY');

    expect(result.jurisdiction).toBe('NY');
    expect(result.summary.riskLevel).toBe('High');

    // Security deposit 1-month cap
    const deposit = result.clauses.find((c) => c.category === 'SecurityDeposit');
    expect(deposit).toBeDefined();
    expect(deposit?.status).toBe('LikelyUnenforceable');
    expect(deposit?.statuteCitation).toContain('7-108');

    // Late fee: 15% on 2nd day
    const lateFee = result.clauses.find((c) => c.category === 'LateFees');
    expect(lateFee).toBeDefined();
    expect(lateFee?.status).toBe('LikelyUnenforceable');
    expect(lateFee?.statuteCitation).toContain('238-a');

    // Self-help lockout
    const lockout = result.clauses.find((c) => c.category === 'EvictionLockout');
    expect(lockout).toBeDefined();
    expect(lockout?.status).toBe('LikelyUnenforceable');
    expect(lockout?.statuteCitation).toContain('768');
  });

  it('evaluates Federal baseline only when jurisdiction is FED', () => {
    const clause: Clause = {
      id: 'clause-01',
      title: 'Occupancy',
      rawText: 'No children allowed in the building under any circumstances. Adults only.',
      category: 'General',
      status: 'Standard'
    };

    const result = engine.evaluate([clause], 'FED');
    expect(result.jurisdiction).toBe('FED');
    expect(result.clauses[0].status).toBe('LikelyUnenforceable');
    expect(result.clauses[0].statuteCitation).toContain('3604');
  });

  it('evaluates Florida Miya\'s Law (24h repair notice)', () => {
    const clause: Clause = {
      id: 'clause-01',
      title: 'Landlord Access',
      rawText: 'Landlord may enter premises for repairs upon 12 hours notice to tenant.',
      category: 'EntryNotice',
      status: 'Standard'
    };

    const result = engine.evaluate([clause], 'FL');
    expect(result.jurisdiction).toBe('FL');
    expect(result.clauses[0].status).toBe('LikelyUnenforceable');
    expect(result.clauses[0].statuteCitation).toContain('83.53');
  });

  it('evaluates New York Roommate Law (RPL § 235-f)', () => {
    const clause: Clause = {
      id: 'clause-01',
      title: 'Occupancy Restriction',
      rawText: 'Occupancy shall be strictly limited to the tenant. No roommates or additional occupants permitted.',
      category: 'General',
      status: 'Standard'
    };

    const result = engine.evaluate([clause], 'NY');
    expect(result.jurisdiction).toBe('NY');
    expect(result.clauses[0].status).toBe('LikelyUnenforceable');
    expect(result.clauses[0].statuteCitation).toContain('235-f');
  });

  it('evaluates Texas habitability and repair duty (Tex. Prop. Code § 92.056)', () => {
    const clause: Clause = {
      id: 'clause-01',
      title: 'Condition of Premises',
      rawText: 'Tenant takes premises as-is and waives landlord duty to repair all conditions.',
      category: 'HabitabilityRepairs',
      status: 'Standard'
    };

    const result = engine.evaluate([clause], 'TX');
    expect(result.jurisdiction).toBe('TX');
    expect(result.clauses[0].status).toBe('LikelyUnenforceable');
    expect(result.clauses[0].statuteCitation).toContain('92.056');
  });

  it('evaluates Illinois deposit interest waiver (765 ILCS 715/1)', () => {
    const clause: Clause = {
      id: 'clause-01',
      title: 'Security Deposit',
      rawText: 'Deposit shall be held interest-free and tenant waives any interest on the security deposit.',
      category: 'SecurityDeposit',
      status: 'Standard'
    };

    const result = engine.evaluate([clause], 'IL');
    expect(result.jurisdiction).toBe('IL');
    expect(result.clauses[0].status).toBe('LikelyUnenforceable');
    expect(result.clauses[0].statuteCitation).toContain('715/1');
  });

  it('does not trigger false positive on notice termination clause', () => {
    const noticeClause: Clause = {
      id: 'clause-01',
      title: 'Notice of Termination',
      rawText: 'Tenant shall provide two months notice in writing before vacating the premises.',
      category: 'TerminationRenewal',
      status: 'Standard'
    };

    const result = engine.evaluate([noticeClause], 'CA');
    expect(result.clauses[0].status).toBe('Standard');
    expect(result.clauses[0].statuteCitation).toBeUndefined();
  });

  it('captures composite violations across multiple statutes in Texas', () => {
    const compoundClause: Clause = {
      id: 'clause-01',
      title: 'Default Remedies',
      rawText: 'Landlord may immediately padlock doors and cut off water and electricity if rent is unpaid.',
      category: 'EvictionLockout',
      status: 'Standard'
    };

    const result = engine.evaluate([compoundClause], 'TX');
    expect(result.clauses[0].status).toBe('LikelyUnenforceable');
    expect(result.clauses[0].statuteCitation).toContain('92.0081');
    expect(result.clauses[0].statuteCitation).toContain('92.008');
  });
});
