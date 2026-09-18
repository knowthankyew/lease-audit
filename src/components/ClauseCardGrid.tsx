import React from 'react';
import { Clause } from '../contracts';
import { ExternalLink, CheckSquare, Square, Scale, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ClauseCardGridProps {
  clauses: Clause[];
  selectedClauseIds: Set<string>;
  onToggleClauseSelect: (id: string) => void;
}

export const ClauseCardGrid: React.FC<ClauseCardGridProps> = ({
  clauses,
  selectedClauseIds,
  onToggleClauseSelect
}) => {
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
          </div>
        );
      })}
    </div>
  );
};
