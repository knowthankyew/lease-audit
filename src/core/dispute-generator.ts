import { DisputeRequest, DisputeResult } from '../contracts';

function formatDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const m = months[date.getMonth()];
  const d = date.getDate().toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${m} ${d}, ${y}`;
}

export class DisputeLetterGenerator {
  public generateLetter(request: DisputeRequest): DisputeResult {
    const mdLines: string[] = [];
    const plainLines: string[] = [];
    const statutes = new Set<string>();

    const dateStr = formatDate(new Date());
    const tenantName = request.tenantName?.trim() || '[Tenant Name]';
    const landlordName = request.landlordName?.trim() || '[Landlord / Property Management]';
    const address = request.propertyAddress?.trim() || '[Rental Property Address]';

    // Header
    mdLines.push(`**Date:** ${dateStr}`);
    mdLines.push(`**To:** ${landlordName}`);
    mdLines.push(`**From:** ${tenantName}`);
    mdLines.push(`**Regarding:** Lease Agreement for ${address}`);
    mdLines.push('');

    plainLines.push(`Date: ${dateStr}`);
    plainLines.push(`To: ${landlordName}`);
    plainLines.push(`From: ${tenantName}`);
    plainLines.push(`Regarding: Lease Agreement for ${address}`);
    plainLines.push('');

    if (request.letterType === 'PreSigning') {
      mdLines.push('### RE: Proposed Lease Provisions Requiring Statutory Compliance');
      mdLines.push('');
      mdLines.push(`Dear ${landlordName},`);
      mdLines.push('');
      mdLines.push(`I am currently reviewing the proposed residential lease agreement for the premises at **${address}**. Prior to executing this contract, I have conducted a review of its terms in accordance with governing state and federal landlord-tenant statutes.`);
      mdLines.push('');
      mdLines.push('I identified several provisions that appear to conflict with governing statutory requirements or established public policy. To ensure our agreement is lawful, mutually protective, and fully enforceable, I respectfully request that the following clauses be amended or struck before signing:');
      mdLines.push('');

      plainLines.push('RE: Proposed Lease Provisions Requiring Statutory Compliance\n');
      plainLines.push(`Dear ${landlordName},\n`);
      plainLines.push(`I am currently reviewing the proposed residential lease agreement for the premises at ${address}. Prior to executing this contract, I have conducted a review of its terms in accordance with governing state and federal landlord-tenant statutes.\n`);
      plainLines.push('I identified several provisions that appear to conflict with governing statutory requirements or established public policy. To ensure our agreement is lawful, mutually protective, and fully enforceable, I respectfully request that the following clauses be amended or struck before signing:\n');
    } else {
      mdLines.push('### RE: Formal Notice of Unenforceable Lease Provision(s)');
      mdLines.push('');
      mdLines.push(`Dear ${landlordName},`);
      mdLines.push('');
      mdLines.push(`I am writing regarding the ongoing tenancy at **${address}**. This letter serves as formal notice that certain provisions within our residential lease agreement conflict with mandatory statutory tenant protections under governing law.`);
      mdLines.push('');
      mdLines.push('Please be advised that under governing statutes, private lease contracts cannot waive statutory rights or enforce terms that violate statutory minimums. I request written confirmation that the following provisions will not be enforced and are considered void:');
      mdLines.push('');

      plainLines.push('RE: Formal Notice of Unenforceable Lease Provision(s)\n');
      plainLines.push(`Dear ${landlordName},\n`);
      plainLines.push(`I am writing regarding the ongoing tenancy at ${address}. This letter serves as formal notice that certain provisions within our residential lease agreement conflict with mandatory statutory tenant protections under governing law.\n`);
      plainLines.push('Please be advised that under governing statutes, private lease contracts cannot waive statutory rights or enforce terms that violate statutory minimums. I request written confirmation that the following provisions will not be enforced and are considered void:\n');
    }

    if (!request.flaggedClauses || request.flaggedClauses.length === 0) {
      mdLines.push('*No specific statutory violations were selected for inclusion.*');
      mdLines.push('');
      plainLines.push('[No specific statutory violations were selected for inclusion.]\n');
    } else {
      let itemIndex = 1;
      for (const clause of request.flaggedClauses) {
        const citation = clause.statuteCitation ?? 'Governing Landlord-Tenant Statute';
        statutes.add(citation);

        const title = clause.title ?? `Clause ${clause.sectionNumber ?? clause.id}`;
        const rawQuote = clause.rawText.length > 200
          ? clause.rawText.substring(0, 197) + '...'
          : clause.rawText;

        // Markdown
        mdLines.push(`#### ${itemIndex}. ${title} (${citation})`);
        for (const qLine of rawQuote.split('\n')) {
          mdLines.push(`> "${qLine.trim()}"`);
        }
        mdLines.push('');
        if (clause.explanation && clause.explanation.trim()) {
          mdLines.push(`*Legal Context:* ${clause.explanation.trim()}`);
          mdLines.push('');
        }
        if (clause.disputeRecommendation && clause.disputeRecommendation.trim()) {
          mdLines.push(`**Requested Remedy:** ${clause.disputeRecommendation.trim()}`);
          mdLines.push('');
        }

        // Plaintext
        plainLines.push(`${itemIndex}. ${title} (${citation})`);
        plainLines.push(`   Quoted provision: "${rawQuote}"`);
        if (clause.explanation && clause.explanation.trim()) {
          plainLines.push(`   Legal Context: ${clause.explanation.trim()}`);
        }
        if (clause.disputeRecommendation && clause.disputeRecommendation.trim()) {
          plainLines.push(`   Requested Remedy: ${clause.disputeRecommendation.trim()}`);
        }
        plainLines.push('');

        itemIndex++;
      }
    }

    // Reservation of Rights
    mdLines.push('### Reservation of Rights');
    mdLines.push('This communication is submitted in good faith for statutory compliance and amicable resolution, and is delivered without waiver of any statutory, common law, or equitable rights, claims, defenses, or remedies available under federal, state, or municipal law.');
    mdLines.push('');

    plainLines.push('Reservation of Rights\n');
    plainLines.push('This communication is submitted in good faith for statutory compliance and amicable resolution, and is delivered without waiver of any statutory, common law, or equitable rights, claims, defenses, or remedies available under federal, state, or municipal law.\n');

    // Next Steps
    mdLines.push('### Next Steps');
    mdLines.push('I value a transparent, compliant, and professional landlord-tenant relationship and look forward to promptly resolving these items. Please provide your written response or revised lease agreement within five (5) business days of receipt.');
    mdLines.push('');
    mdLines.push('Sincerely,');
    mdLines.push('');
    mdLines.push(`**${tenantName}**  `);
    mdLines.push(`*${address}*`);

    plainLines.push('Next Steps');
    plainLines.push('I value a transparent, compliant, and professional landlord-tenant relationship and look forward to promptly resolving these items. Please provide your written response or revised lease agreement within five (5) business days of receipt.\n');
    plainLines.push('Sincerely,\n');
    plainLines.push(`${tenantName}`);
    plainLines.push(`${address}`);

    return {
      letterMarkdown: mdLines.join('\n'),
      letterPlaintext: plainLines.join('\n'),
      statutesCited: Array.from(statutes).sort()
    };
  }
}
