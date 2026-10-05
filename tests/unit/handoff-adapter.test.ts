import { describe, it, expect } from 'vitest';
import { mapHandoffToLeaseAuditResult } from '../../src/core/handoff-adapter';
import { KtyHandoffPayload } from '@knowthankyew/privacy-telemetry';

describe('Milestone 7 Phase 3: LeaseAudit Handoff Intake Bypass (tests/unit/handoff-adapter.test.ts)', () => {
  const samplePayload: KtyHandoffPayload = {
    version: '1.0',
    originApp: 'knowthankyew-extension',
    domain: 'luxury-apartments-lease.com',
    scanTimestamp: '2026-10-04T19:00:00.000Z',
    riskScore: 75,
    summary: { critical: 1, warning: 1, info: 0 },
    primaryLegalLink: {
      url: 'https://luxury-apartments-lease.com/lease-agreement',
      title: 'Model Lease Agreement',
      category: 'TERMS',
      source: 'DOM_ANCHOR',
    },
    targetTool: 'lease-audit',
    findings: [
      {
        ruleId: 'LEASE-ARB-01',
        title: 'Mandatory Binding Arbitration & Jury Trial Waiver',
        category: 'ARBITRATION',
        severity: 'CRITICAL',
        statuteCode: 'Cal. Civ. Code § 1953(a)(4)',
        statuteTitle: 'Void Tenant Procedural Rights Waivers',
        matchedSnippet: 'Tenant waives all rights to trial by jury in any action or proceeding arising out of this Lease.',
        explanation: 'Under California Civil Code § 1953(a)(4), pre-dispute jury waivers in residential leases are void and unenforceable as contrary to public policy.',
        recommendation: 'Notify landlord that jury trial waiver is void under Cal. Civ. Code § 1953(a)(4).',
      },
      {
        ruleId: 'LEASE-RENEW-01',
        title: 'Unilateral Rent Increase on Renewal',
        category: 'UNILATERAL_CHANGE',
        severity: 'WARNING',
        statuteCode: 'Cal. Civ. Code § 827',
        statuteTitle: 'Notice of Change in Terms of Tenancy',
        matchedSnippet: 'Landlord may modify rent or lease terms upon 15 days notice prior to monthly renewal.',
        explanation: 'Statute requires minimum 30 or 90 days notice for rent adjustments depending on percentage.',
        recommendation: 'Request standard statutory notice period.',
      },
    ],
  };

  it('maps KtyHandoffPayload to an actionable LeaseAudit AuditResult', () => {
    const result = mapHandoffToLeaseAuditResult(samplePayload, 'CA');

    expect(result.jurisdiction).toBe('CA');
    expect(result.summary.totalClauses).toBe(2);
    expect(result.summary.unenforceableCount).toBe(1);
    expect(result.summary.watchCount).toBe(1);
    expect(result.summary.riskLevel).toBe('High');

    const arbitrationClause = result.clauses[0];
    expect(arbitrationClause.title).toBe('Mandatory Binding Arbitration & Jury Trial Waiver');
    expect(arbitrationClause.status).toBe('LikelyUnenforceable');
    expect(arbitrationClause.statuteCitation).toBe('Cal. Civ. Code § 1953(a)(4)');
    expect(arbitrationClause.disputeRecommendation).toContain('Cal. Civ. Code § 1953(a)(4)');

    const unilateralClause = result.clauses[1];
    expect(unilateralClause.status).toBe('Watch');
  });
});
