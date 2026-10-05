import { KtyHandoffPayload } from '@knowthankyew/privacy-telemetry';
import { AuditResult, Clause } from '../contracts';
import { ClauseCategory, ClauseSeverity } from '../contracts/enums';

/**
 * Maps a KnowThankYew extension handoff payload into an AuditResult for LeaseAudit.
 */
export function mapHandoffToLeaseAuditResult(
  payload: KtyHandoffPayload,
  jurisdiction = 'CA'
): AuditResult {
  const clauses: Clause[] = payload.findings.map((f, idx) => {
    let status: ClauseSeverity = 'Standard';
    if (f.severity === 'CRITICAL') status = 'LikelyUnenforceable';
    else if (f.severity === 'WARNING') status = 'Watch';

    let category: ClauseCategory = 'General';
    if (f.category === 'AUTO_RENEWAL') category = 'TerminationRenewal';
    else if (f.category === 'UNILATERAL_CHANGE') category = 'General';
    else if (f.category === 'ARBITRATION') category = 'General';

    return {
      id: `handoff-clause-${f.ruleId || idx + 1}`,
      sectionNumber: `§${idx + 1}`,
      title: f.title,
      rawText: f.matchedSnippet,
      category,
      status,
      matchedRuleId: f.ruleId,
      statuteCitation: f.statuteCode,
      statuteSummary: f.statuteTitle,
      explanation: f.explanation,
      disputeRecommendation: f.recommendation,
    };
  });

  const total = clauses.length;
  const unenforceableCount = clauses.filter((c) => c.status === 'LikelyUnenforceable').length;
  const watchCount = clauses.filter((c) => c.status === 'Watch').length;
  const standardCount = clauses.filter((c) => c.status === 'Standard').length;

  let riskLevel: 'Low' | 'Moderate' | 'High' = 'Low';
  if (unenforceableCount > 0) {
    riskLevel = 'High';
  } else if (watchCount > 0) {
    riskLevel = 'Moderate';
  }

  return {
    auditId: `handoff-lease-${payload.domain}-${Date.parse(payload.scanTimestamp) || Date.now()}`,
    jurisdiction,
    jurisdictionName: `${jurisdiction} Statutory Tenant Protection`,
    timestamp: payload.scanTimestamp,
    summary: {
      totalClauses: total,
      standardCount,
      watchCount,
      unenforceableCount,
      riskLevel,
    },
    clauses,
  };
}
