import React from 'react';
import { KtyHandoffPayload } from '@knowthankyew/privacy-telemetry';

interface HandoffBannerProps {
  payload: KtyHandoffPayload;
  onClear: () => void;
}

export const HandoffBanner: React.FC<HandoffBannerProps> = ({ payload, onClear }) => {
  return (
    <div
      className="handoff-banner"
      style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid #0284c7',
        borderRadius: '8px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.25rem' }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9' }}>
            Live Reality Engine Handoff: {payload.domain}
          </span>
          <span
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Intake Bypassed
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          style={{
            background: '#1e293b',
            border: '1px solid #475569',
            color: '#e2e8f0',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Back to Intake Dropzone
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.45 }}>
        Lease clauses pre-populated directly from the KnowThankYew Reality Engine browser extension. {payload.findings.length} findings were detected and pre-sanitized in local browser memory with zero cloud egress.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
        <span>🕒 Scanned: {new Date(payload.scanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span>⚠️ Risk Score: {payload.riskScore} / 100</span>
        {payload.primaryLegalLink && (
          <a
            href={payload.primaryLegalLink.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>View Original {payload.primaryLegalLink.title || 'Agreement'} ↗</span>
          </a>
        )}
      </div>
    </div>
  );
};
