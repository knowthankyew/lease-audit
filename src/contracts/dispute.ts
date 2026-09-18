import { Clause } from './lease';
import { LetterType } from './enums';

export interface DisputeRequest {
  jurisdiction: string;
  tenantName: string;
  landlordName: string;
  propertyAddress: string;
  letterType: LetterType;
  flaggedClauses: Clause[];
}

export interface DisputeResult {
  letterMarkdown: string;
  letterPlaintext: string;
  statutesCited: string[];
}
