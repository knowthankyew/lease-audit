import { describe, it, expect } from 'vitest';
import { DisputeLetterGenerator } from '../../src/core';
import { DisputeRequest } from '../../src/contracts';

describe('DisputeLetterGenerator', () => {
  const generator = new DisputeLetterGenerator();

  it('generates pre-signing amendment request with statutory citations and remedies', () => {
    const request: DisputeRequest = {
      jurisdiction: 'CA',
      tenantName: 'Alex Morgan',
      landlordName: 'Apex Residential LLC',
      propertyAddress: '500 Howard St, Apt 2B, San Francisco, CA',
      letterType: 'PreSigning',
      flaggedClauses: [
        {
          id: 'clause-03',
          sectionNumber: '3',
          title: 'Security Deposit Terms',
          rawText: 'Deposit shall be $6,000.00 (two months rent).',
          category: 'SecurityDeposit',
          status: 'LikelyUnenforceable',
          statuteCitation: 'Cal. Civ. Code § 1950.5(c)',
          explanation: 'California caps deposits at 1 month rent.',
          disputeRecommendation: 'Reduce deposit to one month rent.'
        }
      ]
    };

    const result = generator.generateLetter(request);

    expect(result).toBeDefined();
    expect(result.letterPlaintext).toContain('Alex Morgan');
    expect(result.letterPlaintext).toContain('Apex Residential LLC');
    expect(result.letterPlaintext).toContain('Cal. Civ. Code § 1950.5(c)');
    expect(result.letterPlaintext).toContain('Reduce deposit to one month rent.');
    expect(result.statutesCited).toContain('Cal. Civ. Code § 1950.5(c)');
    expect(result.letterPlaintext).toContain('Proposed Lease Provisions');
  });

  it('generates tenancy dispute notice for active leases with reservation of rights', () => {
    const request: DisputeRequest = {
      jurisdiction: 'NY',
      tenantName: 'Jordan Lee',
      landlordName: 'Midtown Towers LLC',
      propertyAddress: '200 E 34th St, New York, NY',
      letterType: 'TenancyDispute',
      flaggedClauses: [
        {
          id: 'clause-04',
          sectionNumber: '4',
          title: 'Late Fees',
          rawText: 'Late fee of $200 assessed on 2nd day.',
          category: 'LateFees',
          status: 'LikelyUnenforceable',
          statuteCitation: 'N.Y. Real Prop. Law § 238-a(2)',
          explanation: 'Late fee cannot exceed $50 or 5% after 5 days.',
          disputeRecommendation: 'Strike fee beyond $50 limit.'
        }
      ]
    };

    const result = generator.generateLetter(request);

    expect(result).toBeDefined();
    expect(result.letterPlaintext).toContain('Jordan Lee');
    expect(result.letterPlaintext).toContain('N.Y. Real Prop. Law § 238-a(2)');
    expect(result.letterPlaintext).toContain('Formal Notice of Unenforceable Lease Provision(s)');
    expect(result.letterPlaintext).toContain('Reservation of Rights');
    expect(result.letterPlaintext).toContain('without waiver of any statutory');
  });

  it('formats multiline quoted lease text with markdown blockquotes', () => {
    const request: DisputeRequest = {
      jurisdiction: 'CA',
      tenantName: 'Sam Taylor',
      landlordName: 'Coastal Living LLC',
      propertyAddress: '100 Ocean Blvd, Santa Monica, CA',
      letterType: 'PreSigning',
      flaggedClauses: [
        {
          id: 'clause-01',
          title: 'Quiet Enjoyment & Entry',
          rawText: 'Landlord may enter at any time.\nNo prior notice required under any circumstance.',
          category: 'EntryNotice',
          status: 'LikelyUnenforceable',
          statuteCitation: 'Cal. Civ. Code § 1954',
          explanation: 'California requires 24 hours written notice.',
          disputeRecommendation: 'Stipulate 24-hour written notice.'
        }
      ]
    };

    const result = generator.generateLetter(request);

    expect(result.letterMarkdown).toContain('> "Landlord may enter at any time."');
    expect(result.letterMarkdown).toContain('> "No prior notice required under any circumstance."');
    expect(result.letterMarkdown).toContain('Reservation of Rights');
  });
});
