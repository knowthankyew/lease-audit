import { describe, it, expect } from 'vitest';
import {
  auditZeroEgress,
  auditStatutoryParity,
  auditVocabulary,
  auditPolicyPacks,
  auditPortfolioMasterBrief,
// @ts-expect-error - ESM audit script without bundled declaration
} from '../../scripts/audit-claims.mjs';

describe('LeaseAudit Claims & Privacy Invariant Linter (claims-linter.test.ts)', () => {
  it('enforces zero remote egress and strict loopback-only CSP invariant', () => {
    const errors: string[] = [];
    auditZeroEgress(errors);
    expect(errors).toEqual([]);
  });

  it('enforces statutory citation parity between README and policy packs', () => {
    const errors: string[] = [];
    auditStatutoryParity(errors);
    expect(errors).toEqual([]);
  });

  it('prohibits unprovable marketing adjectives across documentation and UI', () => {
    const errors: string[] = [];
    auditVocabulary(errors);
    expect(errors).toEqual([]);
  });

  it('validates schema conformance across all 6 statutory tenancy policy packs', () => {
    const errors: string[] = [];
    auditPolicyPacks(errors);
    expect(errors).toEqual([]);
  });

  it('verifies Portfolio Master Brief parity if brief is present', () => {
    const errors: string[] = [];
    const checked = auditPortfolioMasterBrief(errors);
    if (checked) {
      expect(errors).toEqual([]);
    }
  });
});
