#!/usr/bin/env node
/**
 * audit-claims.mjs - Automated Claims, Architectural Parity & Privacy Invariant Linter for LeaseAudit.
 *
 * Enforces:
 * 1. Zero-Egress Privacy Invariant:
 *    - Verifies index.html CSP restricts connect-src to loopback / local OTLP only (no remote egress).
 *    - Verifies src/ contains zero unauthorized remote network egress primitives (fetch, XMLHttpRequest, sendBeacon, axios, WebSocket).
 *    - Verifies default telemetry operates in memory_only mode with strict allowlist.
 * 2. Statutory Legal Reference Parity:
 *    - Validates that statutory protections cited in README.md exist in source code and policy packs.
 * 3. Vocabulary Guardrails:
 *    - Prohibits unprovable marketing adjectives ('bulletproof', 'conclusive', 'definitive', 'infinitely scalable').
 * 4. Policy Pack Conformance:
 *    - Verifies that all 6 statutory tenancy policy packs in policies/jurisdictions/ validate cleanly.
 * 5. Portfolio Master Brief Parity:
 *    - Verifies that KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md accurately reflects current LeaseAudit test count.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = resolve(__dirname, '..');
const DEV_ROOT = resolve(REPO_ROOT, '..');

const PROHIBITED_WORDS = [
  /\bbulletproof\b/i,
  /\bconclusive\b/i,
  /\bdefinitive\b/i,
  /\binfinitely scalable\b/i,
];

const REQUIRED_STATUTES = [
  '3604(a)',
  '3604(f)(3)(B)',
  '3955',
  '4852d',
  '1950.5(c)',
  '1950.5(g)',
  '1954',
  '789.3',
  '1941.1',
  '1671',
  '7-108(1-a)(a)',
  '7-108(1-a)(e)',
  '238-a(2)',
  '768',
  '235-b',
  '235-f',
  '92.103',
  '92.019',
  '92.0081',
  '92.008',
  '92.056',
  '83.49(3)(a)',
  '83.53(2)',
  '83.67',
  '83.51',
  '765 ILCS 710/1',
  '765 ILCS 715/1',
  '735 ILCS 5/9-101',
  '765 ILCS 720/1',
];

/**
 * Audit 1: Zero-Egress & Air-Gapped Privacy Invariants
 */
export function auditZeroEgress(
  errors = [],
  { overrideIndexContent = null, overrideCodeSnippets = null } = {}
) {
  // Check index.html CSP tag directly, ignoring comments
  const indexPath = resolve(REPO_ROOT, 'index.html');
  const indexContentRaw =
    overrideIndexContent !== null
      ? overrideIndexContent
      : existsSync(indexPath)
      ? readFileSync(indexPath, 'utf-8')
      : null;

  if (indexContentRaw === null) {
    errors.push('Missing index.html file');
  } else {
    const indexContent = indexContentRaw.replace(/<!--[\s\S]*?-->/g, '');
    const metaCspMatch =
      indexContent.match(/<meta\s+[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*content\s*=\s*(["'])([\s\S]*?)\1[^>]*>/i) ||
      indexContent.match(/<meta\s+[^>]*content\s*=\s*(["'])([\s\S]*?)\1[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/i);

    if (!metaCspMatch) {
      errors.push('index.html CSP violation: Missing active <meta http-equiv="Content-Security-Policy"> tag');
    } else {
      const cspDirectives = metaCspMatch[2].split(';').map((d) => d.trim()).filter(Boolean);
      const connectDirective = cspDirectives.find((d) => /^connect-src\b/i.test(d));
      if (!connectDirective) {
        errors.push('index.html CSP violation: Missing connect-src directive in Content-Security-Policy');
      } else {
        const tokens = connectDirective.replace(/^connect-src\s+/i, '').split(/\s+/).filter(Boolean);
        for (const token of tokens) {
          if (token === "'self'") continue;
          const urlMatch = token.match(/^http:\/\/(localhost|127\.0\.0\.1|otel-collector)(?::(?:\*|\d+))?$/);
          if (!urlMatch) {
            errors.push(`index.html CSP violation: Unauthorized remote connect-src token detected: ${token}`);
          }
        }
      }
    }
  }

  const networkPrimitiveRegex =
    /(?:\b(?:fetch|\??\.\s*fetch)\s*\(|=\s*fetch\b|\b(?:XMLHttpRequest|axios)\b|\[\s*['"`](?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|axios)['"`]\s*\]|\bnavigator\s*(?:\??\.\s*sendBeacon|\[\s*['"`]sendBeacon['"`]\s*\])|\bnew\s+(?:WebSocket|EventSource)\b|\bimport\s*\()/;

  if (Array.isArray(overrideCodeSnippets)) {
    overrideCodeSnippets.forEach((snippet, idx) => {
      if (networkPrimitiveRegex.test(snippet)) {
        errors.push(`Privacy violation in snippet ${idx + 1}: Unauthorized network primitive detected: ${snippet}`);
      }
    });
  }

  // Scan src/ for unauthorized network primitives
  const srcDir = resolve(REPO_ROOT, 'src');
  function scanFiles(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        scanFiles(fullPath);
      } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const relPath = relative(REPO_ROOT, fullPath).split(sep).join('/');
        const rawContent = readFileSync(fullPath, 'utf-8');
        // Strip block comments while preserving newlines for accurate line numbers
        const noBlockComments = rawContent.replace(/\/\*[\s\S]*?\*\//g, (match) => {
          const newlines = match.match(/\n/g);
          return newlines ? newlines.join('') : '';
        });
        const lines = noBlockComments.split('\n');
        lines.forEach((line, lineIdx) => {
          const trimmed = line.replace(/\/\/.*$/, '').trim();
          if (!trimmed) {
            return;
          }

          if (networkPrimitiveRegex.test(trimmed)) {
            errors.push(`Privacy violation in ${relPath}:${lineIdx + 1}: Unauthorized network primitive detected: ${trimmed}`);
          }
        });
      }
    }
  }

  if (overrideCodeSnippets === null && existsSync(srcDir)) {
    scanFiles(srcDir);
  }

  // Check telemetry allowlist does not contain PII or lease agreement text
  const telemetryPath = resolve(REPO_ROOT, 'src/core/telemetry.ts');
  if (existsSync(telemetryPath)) {
    const telContent = readFileSync(telemetryPath, 'utf-8');
    const prohibitedTelemetryKeys = ['lease_text', 'agreement_text', 'tenant_name', 'landlord_name', 'property_address'];
    for (const key of prohibitedTelemetryKeys) {
      if (telContent.includes(`'${key}'`)) {
        errors.push(`Privacy violation in telemetry.ts: Prohibited PII attribute key detected in allowlist: '${key}'`);
      }
    }

    if (!/new\s+MemoryExporter\s*\(/.test(telContent)) {
      errors.push('Privacy violation in telemetry.ts: MemoryExporter must be instantiated as the default exporter');
    }
    if (!telContent.includes("mode: 'memory_only'")) {
      errors.push("Privacy violation in telemetry.ts: Default mode must be explicitly 'memory_only'");
    }
    if (!telContent.includes("serviceName: 'lease-audit'")) {
      errors.push("Privacy violation in telemetry.ts: Default serviceName must be 'lease-audit'");
    }
  }
}

/**
 * Audit 2: Statutory Reference Parity
 */
export function auditStatutoryParity(errors = []) {
  const readmePath = resolve(REPO_ROOT, 'README.md');
  const policiesDir = resolve(REPO_ROOT, 'policies/jurisdictions');

  if (!existsSync(readmePath)) {
    errors.push('Missing README.md');
    return;
  }
  if (!existsSync(policiesDir)) {
    errors.push('Missing policies/jurisdictions directory');
    return;
  }

  const readmeContent = readFileSync(readmePath, 'utf-8');
  const policyFiles = readdirSync(policiesDir).filter((f) => f.endsWith('.json'));
  const allPolicyTexts = policyFiles
    .map((f) => readFileSync(resolve(policiesDir, f), 'utf-8'))
    .join('\n');

  for (const statute of REQUIRED_STATUTES) {
    if (!readmeContent.includes(statute)) {
      errors.push(`README.md lacks declared statutory reference: '${statute}'`);
    }
    if (!allPolicyTexts.includes(statute)) {
      errors.push(`Missing statutory citation in policies/jurisdictions for: '${statute}'`);
    }
  }
}

/**
 * Audit 3: Vocabulary Guardrails
 */
export function auditVocabulary(errors = []) {
  const docsToCheck = [
    resolve(REPO_ROOT, 'README.md'),
    resolve(REPO_ROOT, 'ARCHITECTURE.md'),
    resolve(REPO_ROOT, 'src/components/Header.tsx'),
    resolve(REPO_ROOT, 'src/components/DisputeStudioModal.tsx'),
    resolve(REPO_ROOT, 'src/components/LeaseWorkbench.tsx'),
  ];

  for (const docPath of docsToCheck) {
    if (!existsSync(docPath)) continue;
    const lines = readFileSync(docPath, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      const trimmed = line.trim();
      if (
        trimmed.startsWith('#') &&
        (lower.includes('prohibited marketing') || lower.includes('vocabulary guardrail'))
      ) {
        return;
      }
      if (
        trimmed.startsWith('|') &&
        lower.includes('prohibits unprovable')
      ) {
        return;
      }
      for (const pattern of PROHIBITED_WORDS) {
        if (pattern.test(line)) {
          errors.push(`Prohibited marketing word '${pattern.source}' found in ${relative(REPO_ROOT, docPath)}:${idx + 1}: ${line.trim()}`);
        }
      }
    });
  }
}

/**
 * Audit 4: Statutory Policy Pack Conformance
 */
export function auditPolicyPacks(errors = []) {
  const jurisdictionsDir = resolve(REPO_ROOT, 'policies/jurisdictions');
  if (!existsSync(jurisdictionsDir)) {
    errors.push('Missing policies/jurisdictions directory');
    return;
  }

  const files = readdirSync(jurisdictionsDir).filter((f) => f.endsWith('.json'));
  if (files.length < 6) {
    errors.push(`Expected 6 statutory tenancy policy packs, found ${files.length}`);
  }

  const ALLOWED_CATEGORIES = new Set([
    'SecurityDeposit',
    'LateFees',
    'EntryNotice',
    'HabitabilityRepairs',
    'EvictionLockout',
    'TerminationRenewal',
    'Disclosures',
    'General',
  ]);

  const ALLOWED_SEVERITIES = new Set([
    'Standard',
    'Watch',
    'LikelyUnenforceable',
  ]);

  for (const file of files) {
    const fullPath = resolve(jurisdictionsDir, file);
    try {
      const parsed = JSON.parse(readFileSync(fullPath, 'utf-8'));
      if (!parsed.jurisdiction || !parsed.jurisdictionName) {
        errors.push(`Policy pack ${file} missing jurisdiction or jurisdictionName`);
      }
      if (!parsed.statuteVersion || !parsed.lastAudited) {
        errors.push(`Policy pack ${file} missing statuteVersion or lastAudited`);
      }
      if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) {
        errors.push(`Policy pack ${file} missing non-empty rules array`);
      } else {
        for (const rule of parsed.rules) {
          if (!rule.id || !rule.name || !rule.statuteCitation || !rule.statuteSummary) {
            errors.push(`Policy pack ${file} rule missing required fields: ${rule.id || 'unknown'}`);
          }
          if (!ALLOWED_CATEGORIES.has(rule.category)) {
            errors.push(`Policy pack ${file} rule ${rule.id} invalid category: ${rule.category}`);
          }
          if (!ALLOWED_SEVERITIES.has(rule.severity)) {
            errors.push(`Policy pack ${file} rule ${rule.id} invalid severity: ${rule.severity}`);
          }
          if (!Array.isArray(rule.triggerPatterns) || rule.triggerPatterns.length === 0) {
            errors.push(`Policy pack ${file} rule ${rule.id} missing triggerPatterns`);
          } else {
            for (const pattern of rule.triggerPatterns) {
              try {
                new RegExp(pattern, 'i');
              } catch (e) {
                errors.push(`Policy pack ${file} rule ${rule.id} invalid regex: ${pattern}`);
              }
            }
          }
          if (!rule.disputeTemplate || typeof rule.disputeTemplate !== 'string') {
            errors.push(`Policy pack ${file} rule ${rule.id} missing disputeTemplate`);
          }
        }
      }
    } catch (err) {
      errors.push(`Failed to parse policy pack ${file}: ${err.message}`);
    }
  }
}

/**
 * Audit 5: Portfolio Master Brief Parity
 */
export function auditPortfolioMasterBrief(
  errors = [],
  { requireBrief = false, overrideBriefPath = null } = {}
) {
  const briefCandidates = overrideBriefPath
    ? [overrideBriefPath]
    : [
        resolve(DEV_ROOT, 'KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md'),
        resolve(REPO_ROOT, 'KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md'),
      ];
  const briefPath = briefCandidates.find((p) => existsSync(p));

  if (!briefPath) {
    if (requireBrief) {
      errors.push('KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md not found but required via --require-brief.');
    }
    return false;
  }

  const briefContent = readFileSync(briefPath, 'utf-8');
  const match = briefContent.match(/`lease-audit`.*?(\d+)\/(\d+)\s+Unit Tests/);
  if (!match) {
    errors.push('Could not find lease-audit test inventory count in KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md');
    return false;
  }

  const documentedCount = parseInt(match[1], 10);
  const vitestReportPath = resolve(REPO_ROOT, '.vitest/json/output.json');
  let actualCount = 0;

  if (existsSync(vitestReportPath)) {
    try {
      const data = JSON.parse(readFileSync(vitestReportPath, 'utf-8'));
      if (typeof data.numTotalTests === 'number') {
        actualCount = data.numTotalTests;
      }
    } catch {
      // Ignored: fallback below
    }
  }

  if (actualCount === 0) {
    try {
      execSync('npx vitest run --reporter=json --outputFile.json=.vitest/json/output.json', {
        cwd: REPO_ROOT,
        stdio: 'pipe',
      });
      if (existsSync(vitestReportPath)) {
        const data = JSON.parse(readFileSync(vitestReportPath, 'utf-8'));
        if (typeof data.numTotalTests === 'number') {
          actualCount = data.numTotalTests;
        }
      }
    } catch {
      // Ignored
    }
  }

  if (documentedCount !== actualCount) {
    errors.push(
      `Portfolio Brief Drift: KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md documents ${match[1]}/${match[2]} tests, but actual test suite has ${actualCount} tests.`
    );
    return false;
  }

  return true;
}

/**
 * Main execution CLI
 */
export function runAllAudits(options = {}) {
  const errors = [];
  auditZeroEgress(errors);
  auditStatutoryParity(errors);
  auditVocabulary(errors);
  auditPolicyPacks(errors);
  const briefChecked = auditPortfolioMasterBrief(errors, options);

  return { errors, briefChecked };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('=== LeaseAudit Claims, Architecture & Privacy Invariant Audit ===\n');
  const requireBrief = process.argv.includes('--require-brief');
  const { errors, briefChecked } = runAllAudits({ requireBrief });

  if (errors.length > 0) {
    console.error(`[FAIL] Found ${errors.length} claims / architectural invariant violation(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('[PASS] All LeaseAudit architectural & claims invariants verified:');
  console.log('  ✓ Zero remote egress verified (loopback OTLP only, zero remote primitives in src/)');
  console.log('  ✓ Statutory citations verified across Federal and State jurisdictions (29 rules)');
  console.log('  ✓ Zero prohibited marketing adjectives detected');
  console.log('  ✓ Declarative tenancy policy packs validated (6 jurisdictions)');
  if (briefChecked) {
    console.log('  ✓ Portfolio Master Brief parity verified');
  } else {
    console.log('  - Portfolio Master Brief check skipped (isolated CI)');
  }
  process.exit(0);
}
