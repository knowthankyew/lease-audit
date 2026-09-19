import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, GroundedSourcesModal, LeaseWorkbench, AuditScorecard, ClauseCardGrid, DisputeStudioModal, PrivacyAuditModal } from './components';
import { ClauseSegmenter, RuleEvaluationEngine, telemetry } from './core';
import { AuditResult } from './contracts';
import { SAMPLE_LEASES, JURISDICTION_RULES } from './data';
import { Info, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [scenarioId, setScenarioId] = useState<string>('ca');
  const [jurisdiction, setJurisdiction] = useState<string>('CA');
  const [rawText, setRawText] = useState<string>(SAMPLE_LEASES.ca.text);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedClauseIds, setSelectedClauseIds] = useState<Set<string>>(new Set());
  const [isGroundedSourcesOpen, setIsGroundedSourcesOpen] = useState<boolean>(false);
  const [isDisputeStudioOpen, setIsDisputeStudioOpen] = useState<boolean>(false);
  const [isPrivacyAuditOpen, setIsPrivacyAuditOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const segmenter = useMemo(() => new ClauseSegmenter(), []);
  const engine = useMemo(() => new RuleEvaluationEngine(), []);

  const totalGroundedSources = useMemo(() => {
    return Object.values(JURISDICTION_RULES).reduce((acc, curr) => acc + curr.rules.length, 0);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const runAudit = useCallback(() => {
    if (!rawText.trim()) {
      showToast('Please upload or paste a lease to analyze.');
      return;
    }

    setIsLoading(true);
    const span = telemetry.startSpan('evaluate_lease_rules', { jurisdiction, char_count: rawText.length });
    telemetry.recordAuditEvent('document_ingested', `Ingested lease document (${rawText.length} chars)`, {
      jurisdiction,
      char_count: rawText.length,
    });

    setTimeout(() => {
      const clauses = segmenter.segment(rawText);
      const result = engine.evaluate(clauses, jurisdiction);
      setAuditResult(result);

      // Auto-select all flagged clauses for dispute studio
      const flagged = new Set<string>();
      for (const c of result.clauses) {
        if (c.status !== 'Standard') {
          flagged.add(c.id);
        }
      }
      setSelectedClauseIds(flagged);
      setIsLoading(false);

      const flaggedCount = result.summary.watchCount + result.summary.unenforceableCount;
      telemetry.recordAuditEvent('rules_evaluated', `Evaluated ${result.summary.totalClauses} clauses against ${result.jurisdictionName} statutes`, {
        total_clauses: result.summary.totalClauses,
        flagged_clauses: flaggedCount,
      });

      span.end('OK', {
        total_clauses: result.summary.totalClauses,
        flagged_clauses: flaggedCount,
      });

      showToast(`Audit complete: ${result.summary.totalClauses} clauses analyzed against ${result.jurisdictionName} statutes.`);
    }, 100);
  }, [rawText, jurisdiction, segmenter, engine, showToast]);

  // Run audit on mount for default CA sample
  useEffect(() => {
    runAudit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScenarioChange = (id: string) => {
    telemetry.restartSession();
    setScenarioId(id);
    if (id === 'custom') {
      setRawText('');
      setAuditResult(null);
      setSelectedClauseIds(new Set());
      showToast('Switched to blank custom lease input.');
    } else if (id in SAMPLE_LEASES) {
      const s = SAMPLE_LEASES[id as keyof typeof SAMPLE_LEASES];
      setRawText(s.text);
      setJurisdiction(s.jurisdiction);
      const clauses = segmenter.segment(s.text);
      const result = engine.evaluate(clauses, s.jurisdiction);
      setAuditResult(result);
      const flagged = new Set<string>();
      for (const c of result.clauses) {
        if (c.status !== 'Standard') {
          flagged.add(c.id);
        }
      }
      setSelectedClauseIds(flagged);
      telemetry.recordAuditEvent('document_ingested', `Loaded scenario: ${s.title}`, { jurisdiction: s.jurisdiction });
      showToast(`Loaded ${s.title}`);
    }
  };

  const handlePurgeData = () => {
    telemetry.burn();
    setRawText('');
    setAuditResult(null);
    setSelectedClauseIds(new Set());
    setScenarioId('custom');
    showToast('🔥 All local lease data & telemetry wiped from memory.');
  };

  const handleToggleClauseSelect = (id: string) => {
    setSelectedClauseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExportJson = () => {
    if (!auditResult) return;
    const jsonStr = JSON.stringify(auditResult, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lease-audit-${auditResult.jurisdiction.toLowerCase()}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported audit report as JSON.');
  };

  const filteredClauses = useMemo(() => {
    if (!auditResult) return [];
    if (activeFilter === 'all') return auditResult.clauses;
    return auditResult.clauses.filter((c) => c.status === activeFilter);
  }, [auditResult, activeFilter]);

  const flaggedClausesForDispute = useMemo(() => {
    if (!auditResult) return [];
    return auditResult.clauses.filter((c) => selectedClauseIds.has(c.id));
  }, [auditResult, selectedClauseIds]);

  const claims = telemetry.getPrivacyClaims();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {claims.isEnterpriseBuild && (
        <div className="enterprise-persistent-banner" role="alert">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Enterprise Mode:</strong> Telemetry exporter active ({claims.badgeLabel}). Operational metadata exported to <code>{claims.otlpEndpoint}</code>. Document content strictly redacted.
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            onClick={() => setIsPrivacyAuditOpen(true)}
          >
            Inspect Telemetry
          </button>
        </div>
      )}

      <div className="disclaimer-banner" role="note">
        <Info size={16} />
        <span>
          <strong>Notice:</strong> LeaseAudit is an educational statutory reality engine, not a law firm.{' '}
          {claims.disclaimerExecutionText}
        </span>
      </div>

      <Header
        scenarioId={scenarioId}
        onScenarioChange={handleScenarioChange}
        onPurgeData={handlePurgeData}
        onOpenGroundedSources={() => setIsGroundedSourcesOpen(true)}
        onOpenPrivacyAudit={() => setIsPrivacyAuditOpen(true)}
        groundedSourcesCount={totalGroundedSources}
      />

      <main className="main-content" role="main">
        <LeaseWorkbench
          rawText={rawText}
          jurisdiction={jurisdiction}
          onTextChange={setRawText}
          onJurisdictionChange={setJurisdiction}
          onRunAudit={runAudit}
          isLoading={isLoading}
        />

        {auditResult && (
          <div>
            <AuditScorecard
              result={auditResult}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              onOpenDisputeStudio={() => setIsDisputeStudioOpen(true)}
              onExportJson={handleExportJson}
            />

            <ClauseCardGrid
              clauses={filteredClauses}
              selectedClauseIds={selectedClauseIds}
              onToggleClauseSelect={handleToggleClauseSelect}
            />
          </div>
        )}
      </main>

      <GroundedSourcesModal
        isOpen={isGroundedSourcesOpen}
        onClose={() => setIsGroundedSourcesOpen(false)}
      />

      <PrivacyAuditModal
        isOpen={isPrivacyAuditOpen}
        onClose={() => setIsPrivacyAuditOpen(false)}
        onBurnData={handlePurgeData}
      />

      {auditResult && (
        <DisputeStudioModal
          isOpen={isDisputeStudioOpen}
          onClose={() => setIsDisputeStudioOpen(false)}
          flaggedClauses={flaggedClausesForDispute}
          jurisdiction={auditResult.jurisdiction}
          onCopySuccess={() => showToast('Dispute letter copied to clipboard!')}
        />
      )}

      {toastMessage && (
        <div className="toast show" role="status">
          {toastMessage}
        </div>
      )}

      <footer className="footer-wrapper" role="contentinfo">
        <p><strong>LeaseAudit Studio{claims.appTitleSuffix}</strong> — {claims.footerTitle}</p>
        <p>Ground-truth statutory rules across California, New York, Texas, Florida, Illinois, and Federal Law.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          {claims.footerSubtext}
        </p>
      </footer>
    </div>
  );
};
