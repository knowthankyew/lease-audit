import { ClauseCategory, ClauseSeverity } from './enums';

export interface RuleItem {
  id: string;
  category: ClauseCategory;
  name: string;
  severity: ClauseSeverity;
  statuteCitation: string;
  statuteSummary: string;
  officialUrl: string;
  triggerPatterns: string[];
  contraIndicatorPatterns: string[];
  disputeTemplate: string;
}

export interface JurisdictionRules {
  jurisdiction: string;
  jurisdictionName: string;
  statuteVersion: string;
  lastAudited: string;
  officialSourceUrl: string;
  rules: RuleItem[];
}
