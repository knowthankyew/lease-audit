import { AuditResult, Clause, ClauseSeverity, JurisdictionRules, RuleItem } from '../contracts';
import { JURISDICTION_RULES } from '../data';

const SEVERITY_ORDER: Record<ClauseSeverity, number> = {
  Standard: 0,
  Watch: 1,
  LikelyUnenforceable: 2
};

export class RuleEvaluationEngine {
  private compiledRegexCache = new Map<string, RegExp | null>();

  private getOrCreateRegex(pattern: string): RegExp | null {
    if (!pattern || !pattern.trim()) return null;
    const existing = this.compiledRegexCache.get(pattern);
    if (existing !== undefined) return existing;

    try {
      const reg = new RegExp(pattern, 'i');
      this.compiledRegexCache.set(pattern, reg);
      return reg;
    } catch {
      this.compiledRegexCache.set(pattern, null);
      return null;
    }
  }

  public getJurisdictionRules(jurisdiction: string): JurisdictionRules | null {
    const key = jurisdiction.trim().toUpperCase();
    return JURISDICTION_RULES[key] ?? null;
  }

  public evaluate(clauses: Clause[], stateCode: string): AuditResult {
    const stateKey = (stateCode || 'FED').trim().toUpperCase();
    const stateRules = stateKey !== 'FED' ? this.getJurisdictionRules(stateKey) : null;
    const federalRules = this.getJurisdictionRules('FED');

    const allRules: RuleItem[] = [];
    if (stateRules) {
      allRules.push(...stateRules.rules);
    }
    if (federalRules) {
      allRules.push(...federalRules.rules);
    }

    const jurisdictionName = stateRules?.jurisdictionName ?? federalRules?.jurisdictionName ?? stateKey;

    for (const clause of clauses) {
      this.evaluateClause(clause, allRules);
    }

    const standard = clauses.filter((c) => c.status === 'Standard').length;
    const watch = clauses.filter((c) => c.status === 'Watch').length;
    const unenforceable = clauses.filter((c) => c.status === 'LikelyUnenforceable').length;

    let riskLevel: 'Low' | 'Moderate' | 'High' = 'Low';
    if (unenforceable >= 2) {
      riskLevel = 'High';
    } else if (unenforceable === 1 || watch >= 2) {
      riskLevel = 'Moderate';
    }

    return {
      auditId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `audit-${Date.now()}`,
      jurisdiction: stateKey,
      jurisdictionName: jurisdictionName,
      timestamp: new Date().toISOString(),
      summary: {
        totalClauses: clauses.length,
        standardCount: standard,
        watchCount: watch,
        unenforceableCount: unenforceable,
        riskLevel: riskLevel
      },
      clauses: clauses
    };
  }

  private evaluateClause(clause: Clause, rules: RuleItem[]): void {
    const matchedRules: RuleItem[] = [];

    for (const rule of rules) {
      let isTriggered = false;
      for (const pattern of rule.triggerPatterns) {
        const regex = this.getOrCreateRegex(pattern);
        if (regex && regex.test(clause.rawText)) {
          isTriggered = true;
          break;
        }
      }

      if (!isTriggered) {
        continue;
      }

      // Check contra-indicators
      let contraIndicated = false;
      for (const contra of rule.contraIndicatorPatterns) {
        const contraRegex = this.getOrCreateRegex(contra);
        if (contraRegex && contraRegex.test(clause.rawText)) {
          contraIndicated = true;
          break;
        }
      }

      if (contraIndicated) {
        continue;
      }

      matchedRules.push(rule);
    }

    if (matchedRules.length > 0) {
      // Find highest severity
      let maxSeverity: ClauseSeverity = 'Standard';
      for (const r of matchedRules) {
        if (SEVERITY_ORDER[r.severity] > SEVERITY_ORDER[maxSeverity]) {
          maxSeverity = r.severity;
        }
      }
      clause.status = maxSeverity;

      const topRules = matchedRules.filter((r) => r.severity === maxSeverity);

      clause.matchedRuleId = Array.from(new Set(topRules.map((r) => r.id))).join(', ');
      clause.statuteCitation = Array.from(new Set(topRules.map((r) => r.statuteCitation))).join('; ');
      clause.statuteSummary = Array.from(new Set(topRules.map((r) => r.statuteSummary))).join(' ');
      clause.officialSourceUrl = topRules[0]?.officialUrl ?? null;
      clause.explanation = Array.from(new Set(topRules.map((r) => r.statuteSummary))).join(' ');

      const clauseIdentifier = clause.sectionNumber ?? clause.id;
      const recommendations = Array.from(
        new Set(topRules.map((r) => r.disputeTemplate.replaceAll('{clauseNumber}', clauseIdentifier)))
      );
      clause.disputeRecommendation = recommendations.join(' ');

      // If the clause was general, adopt the category of the matched rule
      const nonGeneral = topRules.find((r) => r.category !== 'General');
      if (clause.category === 'General' && nonGeneral) {
        clause.category = nonGeneral.category;
      }
    }
  }
}
