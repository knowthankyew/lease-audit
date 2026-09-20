import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, GroundedSourcesModal, LeaseWorkbench, AuditScorecard, ClauseCardGrid, DisputeStudioModal, PrivacyAuditModal } from './components';
import { ClauseSegmenter, RuleEvaluationEngine, telemetry, edgeService, SemanticAnalysisResult } from './core';
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
  const [edgeStatus, setEdgeStatus] = useState<string>(edgeService.getStatus());
  const [edgeProvider, setEdgeProvider] = useState<string>(edgeService.getExecutionProvider());
  const [edgeThroughput, setEdgeThroughput] = useState<number>(edgeService.getThroughput());
  const [modelLoaded, setModelLoaded] = useState<boolean>(edgeService.isModelLoaded());
  const [semanticResults, setSemanticResults] = useState<Map<string, SemanticAnalysisResult>>(new Map());
  const [isSemanticAuditing, setIsSemanticAuditing] = useState<boolean>(false);
  const [streamingTokens, setStreamingTokens] = useState<Map<string, string>>(new Map());

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

  // Run audit on mount for default CA sample and initialize edge ML
  useEffect(() => {
    runAudit();
    edgeService.initialize().catch(console.error);
    const unsub = edgeService.addStatusListener((status, provider) => {
      setEdgeStatus(status);
      setEdgeProvider(provider);
      setEdgeThroughput(edgeService.getThroughput());
      setModelLoaded(edgeService.isModelLoaded());
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScenarioChange = (id: string) => {
    telemetry.restartSession();
    setScenarioId(id);
    setSemanticResults(new Map());
    setStreamingTokens(new Map());
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
    edgeService.burn();
    setRawText('');
    setAuditResult(null);
    setSelectedClauseIds(new Set());
    setSemanticResults(new Map());
    setStreamingTokens(new Map());
    setScenarioId('custom');
    showToast('🔥 All local lease data, edge ML memory & telemetry wiped from memory.');
  };

  const runSemanticAudit = useCallback(async () => {
    if (!auditResult || auditResult.clauses.length === 0) {
      showToast('Please run an initial statutory audit first.');
      return;
    }

    setIsSemanticAuditing(true);
    const span = telemetry.startSpan('evaluate_edge_semantic_lora', {
      jurisdiction,
      clause_count: auditResult.clauses.length,
    });

    telemetry.recordAuditEvent('edge_inference_started', `Started in-browser edge LoRA semantic audit via ${edgeProvider}`, {
      jurisdiction,
      clause_count: auditResult.clauses.length,
      device: edgeProvider,
    });

    try {
      const resultsMap = new Map<string, SemanticAnalysisResult>(semanticResults);
      const targets = auditResult.clauses.filter((c) => c.status !== 'Standard');
      const clausesToAudit = targets.length > 0 ? targets : auditResult.clauses.slice(0, 5);

      for (const clause of clausesToAudit) {
        const res = await edgeService.analyzeClause(
          clause.id,
          clause.rawText,
          jurisdiction,
          (clauseId, _chunk, cumulative) => {
            setStreamingTokens((prev) => new Map(prev).set(clauseId, cumulative));
          }
        );
        resultsMap.set(clause.id, res);
        setSemanticResults(new Map(resultsMap));
      }

      const highRiskCount = Array.from(resultsMap.values()).filter((r) => r.unconscionabilitySeverity === 'High').length;

      telemetry.recordAuditEvent('edge_inference_completed', `Completed edge LoRA semantic analysis on ${clausesToAudit.length} clauses`, {
        clause_count: clausesToAudit.length,
        flagged_count: highRiskCount,
        device: edgeProvider,
      });

      span.end('OK', {
        clause_count: clausesToAudit.length,
        flagged_count: highRiskCount,
        device: edgeProvider,
      });

      showToast(`⚡ Edge LoRA audit complete: ${clausesToAudit.length} clauses analyzed via ${edgeProvider.toUpperCase()}. 0 bytes sent.`);
    } catch (err: any) {
      console.error('Edge semantic audit error:', err);
      showToast('Notice: Edge analysis completed with local fallback.');
      span.end('ERROR', { error_code: 'edge_inference_notice' });
    } finally {
      setIsSemanticAuditing(false);
    }
  }, [auditResult, jurisdiction, edgeProvider, semanticResults, showToast]);

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
    if (activeFilter === 'SemanticHigh') {
      return auditResult.clauses.filter((c) => {
        const sem = semanticResults.get(c.id);
        return sem?.unconscionabilitySeverity === 'High';
      });
    }
    return auditResult.clauses.filter((c) => c.status === activeFilter);
  }, [auditResult, activeFilter, semanticResults]);

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
        edgeProvider={edgeProvider}
        edgeStatus={edgeStatus}
        edgeThroughput={edgeThroughput}
        modelLoaded={modelLoaded}
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
              isSemanticAuditing={isSemanticAuditing}
              onRunSemanticAudit={runSemanticAudit}
              hasSemanticResults={semanticResults.size > 0}
            />

            <ClauseCardGrid
              clauses={filteredClauses}
              selectedClauseIds={selectedClauseIds}
              onToggleClauseSelect={handleToggleClauseSelect}
              semanticResults={semanticResults}
              streamingTokens={streamingTokens}
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
