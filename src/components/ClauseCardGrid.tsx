import React, { useState } from 'react';
import { Clause } from '../contracts';
import { SemanticAnalysisResult } from '../core';
import {
  ExternalLink,
  CheckSquare,
  Square,
  Scale,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Copy,
  Check
} from 'lucide-react';

interface ClauseCardGridProps {
  clauses: Clause[];
  selectedClauseIds: Set<string>;
  onToggleClauseSelect: (id: string) => void;
  semanticResults?: Map<string, SemanticAnalysisResult>;
  streamingTokens?: Map<string, string>;
}

export const ClauseCardGrid: React.FC<ClauseCardGridProps> = ({
  clauses,
  selectedClauseIds,
  onToggleClauseSelect,
  semanticResults,
  streamingTokens
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (clauseId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(clauseId);
    setTimeout(() => setCopiedId(null), 2500);
  };
  if (clauses.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)'
        }}
      >
        No clauses match the selected severity filter.
      </div>
    );
  }

  return (
    <div className="clause-grid">
      {clauses.map((clause) => {
        const isSelected = selectedClauseIds.has(clause.id);
        const isFlagged = clause.status !== 'Standard';

        return (
          <div key={clause.id} className={`clause-card status-${clause.status}`}>
            <div className="clause-card-header">
              <div className="clause-badges">
                <span className="badge-category">{clause.category}</span>
                {clause.sectionNumber && (
                  <span className="badge-category" style={{ fontFamily: 'var(--font-mono)' }}>
                    Sec. {clause.sectionNumber}
                  </span>
                )}
                {clause.status === 'LikelyUnenforceable' && (
                  <span className="badge-status status-tag-unenforceable" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} />
                    Likely Unenforceable
                  </span>
                )}
                {clause.status === 'Watch' && (
                  <span className="badge-status status-tag-watch" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} />
                    Watch Item
                  </span>
                )}
                {clause.status === 'Standard' && (
                  <span className="badge-status status-tag-standard" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} />
                    Standard Term
                  </span>
                )}
              </div>

              {isFlagged && (
                <button
                  type="button"
                  onClick={() => onToggleClauseSelect(clause.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                  title={isSelected ? 'Included in dispute letter' : 'Click to include in dispute letter'}
                >
                  {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  <span>{isSelected ? 'Selected for Dispute' : 'Include in Dispute'}</span>
                </button>
              )}
            </div>

            <h3 className="clause-title">{clause.title ?? clause.id}</h3>

            <div className="clause-raw-text">{clause.rawText}</div>

            {isFlagged && (
              <div className="clause-statutory-analysis">
                <div className="statute-citation-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Scale size={14} color="#38bdf8" />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Statutory Basis:
                    </span>
                  </div>
                  {clause.officialSourceUrl ? (
                    <a
                      href={clause.officialSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="citation-tag"
                      title="Open official legislative text"
                    >
                      {clause.statuteCitation}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="citation-tag">{clause.statuteCitation}</span>
                  )}
                </div>

                {clause.explanation && (
                  <div className="explanation-text">
                    <strong>Statutory Rule: </strong>
                    {clause.explanation}
                  </div>
                )}

                {clause.disputeRecommendation && (
                  <div className="remedy-box">
                    <strong>Recommended Remedy: </strong>
                    {clause.disputeRecommendation}
                  </div>
                )}
              </div>
            )}

            {semanticResults && semanticResults.has(clause.id) && (() => {
              const sem = semanticResults.get(clause.id)!;
              return (
                <div
                  className="clause-semantic-analysis"
                  style={{
                    marginTop: '0.85rem',
                    padding: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    backgroundColor: 'rgba(16, 185, 129, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} color="#10b981" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>
                        FTaaS Edge Semantic Analysis ({sem.executionProvider.toUpperCase()})
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontWeight: 700,
                        backgroundColor: sem.unconscionabilitySeverity === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: sem.unconscionabilitySeverity === 'High' ? '#ef4444' : '#f59e0b'
                      }}
                    >
                      Predatoriness: {sem.semanticRiskScore}/100 • {sem.unconscionabilitySeverity}
                    </span>
                  </div>

                  {sem.hiddenWaiversDetected.length > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#f87171', marginBottom: '0.5rem' }}>
                      <strong>Waiver Warning: </strong>
                      {sem.hiddenWaiversDetected.join('; ')}
                    </div>
                  )}

                  <div
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      padding: '0.65rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle, #334155)',
                      marginTop: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Client-Side Counter-Amendment (Local Heuristic)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(clause.id, sem.aiCounterAmendment)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedId === clause.id ? '#10b981' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem'
                        }}
                        title="Copy counter-amendment text"
                      >
                        {copiedId === clause.id ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === clause.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                      {streamingTokens?.get(clause.id) || sem.aiCounterAmendment}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>Client-Side Semantic Engine</span>
                    <span>100% Volatile Memory • 0 bytes egress</span>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
};
