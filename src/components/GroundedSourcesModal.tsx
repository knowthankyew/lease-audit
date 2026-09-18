import React, { useState } from 'react';
import { X, ExternalLink, ShieldAlert, AlertTriangle, Scale } from 'lucide-react';
import { JURISDICTION_RULES } from '../data';

interface GroundedSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroundedSourcesModal: React.FC<GroundedSourcesModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedJur, setSelectedJur] = useState<string>('CA');

  if (!isOpen) return null;

  const activeData = JURISDICTION_RULES[selectedJur];
  const jurisdictions = Object.keys(JURISDICTION_RULES);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sources-title">
      <div className="modal-container" style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} color="#38bdf8" />
            <h2 id="sources-title" className="modal-title">Grounded Legal Authorities & Statutes</h2>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            LeaseAudit strictly operates on verified, grounded statutory reality. Every evaluated clause is measured
            against active state and federal codes. No hallucinated rules; no vacated administrative actions.
          </p>

          {/* State selection pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {jurisdictions.map((code) => {
              const jur = JURISDICTION_RULES[code];
              const isActive = selectedJur === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedJur(code)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                    color: isActive ? 'var(--primary-contrast)' : 'var(--text-secondary)',
                    border: '1px solid ' + (isActive ? 'var(--primary)' : 'var(--border-medium)'),
                    transition: 'all 150ms ease'
                  }}
                >
                  {jur?.jurisdictionName ?? code} ({jur?.rules.length ?? 0})
                </button>
              );
            })}
          </div>

          {activeData && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Statute Canon Version: </span>
                  <strong>{activeData.statuteVersion}</strong>
                  <span style={{ margin: '0 8px', color: 'var(--border-strong)' }}>|</span>
                  <span style={{ color: 'var(--text-muted)' }}>Last Audited: </span>
                  <strong>{activeData.lastAudited}</strong>
                </div>
                <a
                  href={activeData.officialSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Official Code Portal
                  <ExternalLink size={13} />
                </a>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {activeData.rules.map((rule) => {
                  const isUnenforceable = rule.severity === 'LikelyUnenforceable';
                  return (
                    <div
                      key={rule.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        backgroundColor: '#0c121e',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: isUnenforceable ? '4px solid #ef4444' : '4px solid #f59e0b'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginRight: '6px' }}>
                            [{rule.id}]
                          </span>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{rule.name}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className={isUnenforceable ? 'badge-status status-tag-unenforceable' : 'badge-status status-tag-watch'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            {isUnenforceable ? <ShieldAlert size={12} /> : <AlertTriangle size={12} />}
                            {rule.severity === 'LikelyUnenforceable' ? 'Likely Unenforceable' : 'Watch Item'}
                          </span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '0.5rem' }}>
                        <a
                          href={rule.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="citation-tag"
                        >
                          <Scale size={12} />
                          {rule.statuteCitation}
                          <ExternalLink size={11} />
                        </a>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.45', marginBottom: '0.5rem' }}>
                        {rule.statuteSummary}
                      </p>

                      <div style={{ fontSize: '0.78rem', color: '#7dd3fc', backgroundColor: 'rgba(56, 189, 248, 0.08)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                        <strong>Dispute Remedy: </strong>{rule.disputeTemplate}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
