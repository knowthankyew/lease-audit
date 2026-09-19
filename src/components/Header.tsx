import React from 'react';
import { ShieldCheck, BookOpen, Flame, Activity, AlertTriangle } from 'lucide-react';
import { telemetry } from '../core/telemetry';

interface HeaderProps {
  scenarioId: string;
  onScenarioChange: (id: string) => void;
  onPurgeData: () => void;
  onOpenGroundedSources: () => void;
  onOpenPrivacyAudit: () => void;
  groundedSourcesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  scenarioId,
  onScenarioChange,
  onPurgeData,
  onOpenGroundedSources,
  onOpenPrivacyAudit,
  groundedSourcesCount
}) => {
  const claims = telemetry.getPrivacyClaims();

  return (
    <header className="app-header" role="banner">
      <div className="brand-section">
        <div className="brand-icon" aria-hidden="true">
          <ShieldCheck size={20} color="#ffffff" strokeWidth={2.2} />
        </div>
        <div className="brand-title">
          LeaseAudit Studio
          {claims.isEnterpriseBuild ? (
            <span className="brand-badge enterprise">ENTERPRISE (OTLP)</span>
          ) : (
            <span className="brand-badge">Reality Engine</span>
          )}
        </div>
      </div>

      <div className="header-meta">
        <button
          type="button"
          className={`pill-indicator clickable ${claims.isLocalOnlyHonest ? 'verified' : 'enterprise'}`}
          onClick={onOpenPrivacyAudit}
          title="Inspect real-time telemetry mode, egress policy, and session audit trails"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="pill-dot"></span>
          {claims.isEnterpriseBuild ? <AlertTriangle size={13} color="#f59e0b" /> : <Activity size={12} />}
          <span>{claims.badgeLabel}</span>
        </button>

        <button
          type="button"
          className="pill-indicator clickable"
          onClick={onOpenGroundedSources}
          title="Inspect grounded statutory authorities (CA AB 12, NY HSTPA, TX, FL, IL, SCRA, FHA)"
        >
          <BookOpen size={14} />
          <span>{groundedSourcesCount} Grounded Sources</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="scenario-select" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Sample:
          </label>
          <select
            id="scenario-select"
            className="select-input"
            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            value={scenarioId}
            onChange={(e) => onScenarioChange(e.target.value)}
          >
            <option value="ca">California Lease (AB 12)</option>
            <option value="ny">New York Lease (HSTPA)</option>
            <option value="fed">Federal Fair Housing & SCRA</option>
            <option value="custom">Blank / Custom Lease</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-purge"
          onClick={onPurgeData}
          title="Instantly clear all local storage, lease text, and session memory"
        >
          <Flame size={13} />
          <span>Burn Local Data</span>
        </button>
      </div>
    </header>
  );
};
