import { ClauseCategory, ClauseSeverity } from './enums';

export interface Clause {
  id: string;
  sectionNumber?: string | null;
  title?: string | null;
  rawText: string;
  category: ClauseCategory;
  status: ClauseSeverity;
  matchedRuleId?: string | null;
  statuteCitation?: string | null;
  statuteSummary?: string | null;
  officialSourceUrl?: string | null;
  explanation?: string | null;
  disputeRecommendation?: string | null;
}

export interface AuditSummary {
  totalClauses: number;
  standardCount: number;
  watchCount: number;
  unenforceableCount: number;
  riskLevel: 'Low' | 'Moderate' | 'High';
}

export interface AuditResult {
  auditId: string;
  jurisdiction: string;
  jurisdictionName: string;
  timestamp: string;
  summary: AuditSummary;
  clauses: Clause[];
}
