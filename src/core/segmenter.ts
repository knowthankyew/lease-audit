import { Clause, ClauseCategory } from '../contracts';
import { normalizeText } from './normalizer';

const SECTION_HEADER_REGEX = /^(?:(?:SECTION|ARTICLE|PARAGRAPH|CLAUSE)\s+([0-9IVXLCDM]+(?:\.[0-9]+)*)[:.]?\s*(.*?)$|([0-9]+(?:\.[0-9]+)*)[\.\)]\s+([A-Z][A-Za-z0-9\s,\-\/]{2,40})[:\.\-]?\s*$|^([A-Z\s]{4,35}):\s*$)/i;

const CATEGORY_KEYWORDS: { category: ClauseCategory; keywords: string[] }[] = [
  {
    category: 'EvictionLockout',
    keywords: [
      'self-help', 're-entry', 're-enter', 'lockout', 'padlock', 'pad-lock',
      'change door locks', 'change locks', 'shut off utilities', 'terminate utility',
      "remove tenant's belongings", 'remove and dispose of tenant', 'waiver of notice to quit',
      'summary eviction'
    ]
  },
  {
    category: 'SecurityDeposit',
    keywords: [
      'security deposit', 'damage deposit', 'deposit refund', 'deductions from deposit',
      'deposit return', 'holding deposit', 'escrow', 'normal wear and tear',
      'return of deposit', 'deposit upon signing'
    ]
  },
  {
    category: 'LateFees',
    keywords: [
      'late fee', 'late charge', 'grace period', 'late payment', 'returned check fee',
      'nsf fee', 'bounced check', 'penalty for late'
    ]
  },
  {
    category: 'EntryNotice',
    keywords: [
      'right of entry', 'notice of entry', 'entry by landlord', 'access to premises',
      'access to apartment', 'landlord access', 'landlord entry', 'notice to enter',
      'reasonable notice of entry', 'inspection', '24 hours notice', '24-hour notice',
      '12 hours notice', 'reasonable notice'
    ]
  },
  {
    category: 'HabitabilityRepairs',
    keywords: [
      'habitability', 'maintenance and repair', 'repairs', 'maintenance', 'condition of premises',
      'as-is', 'as is condition', 'tenant agrees to repair', 'pest control', 'air conditioning',
      'heating', 'mold', 'plumbing clogs', 'roof leaks', 'warranty of habitability'
    ]
  },
  {
    category: 'TerminationRenewal',
    keywords: [
      'termination', 'renewal', 'non-renewal', 'notice to vacate', 'month-to-month',
      'surrender', 'military transfer', 'active duty', 'scra', 'early termination', 'lease term'
    ]
  },
  {
    category: 'Disclosures',
    keywords: [
      'lead-based paint', 'lead paint', 'bedbug', 'bed bugs', 'radon', 'flood zone',
      "megan's law", 'sex offender registry', 'asbestos', 'mold disclosure'
    ]
  }
];

export function detectCategory(text: string): ClauseCategory {
  const lower = text.toLowerCase();
  for (const item of CATEGORY_KEYWORDS) {
    for (const kw of item.keywords) {
      if (lower.includes(kw)) {
        return item.category;
      }
    }
  }
  return 'General';
}

function generateDefaultTitle(body: string, category: ClauseCategory): string {
  if (category !== 'General') {
    switch (category) {
      case 'SecurityDeposit':
        return 'Security Deposit Terms';
      case 'LateFees':
        return 'Late Fees and Charges';
      case 'EntryNotice':
        return 'Landlord Access & Notice to Enter';
      case 'HabitabilityRepairs':
        return 'Repairs and Habitability';
      case 'EvictionLockout':
        return 'Default & Eviction Terms';
      case 'TerminationRenewal':
        return 'Termination and Renewal';
      case 'Disclosures':
        return 'Required Disclosures';
      default:
        return 'General Provision';
    }
  }

  const firstSentence = (body.split(/[.\n]/)[0] ?? '').trim();
  if (firstSentence.length > 40) {
    return firstSentence.substring(0, 37) + '...';
  }
  return firstSentence.length > 0 ? firstSentence : 'General Provision';
}

export class ClauseSegmenter {
  public segment(rawText: string): Clause[] {
    const normalizedText = normalizeText(rawText);
    const clauses: Clause[] = [];
    if (!normalizedText.trim()) {
      return clauses;
    }

    const lines = normalizedText.split('\n');
    let currentSectionNumber = '';
    let currentTitle = '';
    let currentBodyLines: string[] = [];
    let clauseIndex = 1;

    const flushCurrentClause = () => {
      const body = currentBodyLines.join('\n').trim();
      if (body.length >= 15) {
        const combined = `${currentTitle} ${body}`.trim();
        const category = detectCategory(combined);
        clauses.push({
          id: `clause-${clauseIndex.toString().padStart(2, '0')}`,
          sectionNumber: currentSectionNumber.trim() ? currentSectionNumber.trim() : null,
          title: currentTitle.trim() ? currentTitle.trim() : generateDefaultTitle(body, category),
          rawText: body,
          category: category,
          status: 'Standard'
        });
        clauseIndex++;
      }
      currentBodyLines = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      const match = line.match(SECTION_HEADER_REGEX);
      if (match) {
        flushCurrentClause();

        if (match[1] !== undefined) {
          currentSectionNumber = match[1];
          currentTitle = (match[2] ?? '').trim();
        } else if (match[3] !== undefined) {
          currentSectionNumber = match[3];
          currentTitle = (match[4] ?? '').trim();
        } else if (match[5] !== undefined) {
          currentSectionNumber = '';
          currentTitle = match[5].trim();
        }
        continue;
      }

      if (!line) {
        if (currentBodyLines.length > 0) {
          const accumulatedText = currentBodyLines.join(' ');
          if (!currentSectionNumber && accumulatedText.length > 100) {
            flushCurrentClause();
            currentTitle = '';
          }
        }
        continue;
      }

      currentBodyLines.push(line);
    }

    flushCurrentClause();

    // Fallback: If no clauses identified via headers, partition by double line breaks
    if (clauses.length === 0 && normalizedText.trim()) {
      const paragraphs = normalizedText.split(/\n\n+/).filter((p) => p.trim().length > 0);
      let idx = 1;
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (trimmed.length >= 15) {
          const category = detectCategory(trimmed);
          clauses.push({
            id: `clause-${idx.toString().padStart(2, '0')}`,
            title: generateDefaultTitle(trimmed, category),
            rawText: trimmed,
            category: category,
            status: 'Standard'
          });
          idx++;
        }
      }
    }

    return clauses;
  }
}
