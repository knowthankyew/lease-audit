import React from 'react';
import { AuditResult } from '../contracts';
import { Mail, Download, ShieldAlert, Zap } from 'lucide-react';

interface AuditScorecardProps {
  result: AuditResult;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onOpenDisputeStudio: () => void;
  onExportJson: () => void;
  isSemanticAuditing?: boolean;
  onRunSemanticAudit?: () => void;
  hasSemanticResults?: boolean;
}

export const AuditScorecard: React.FC<AuditScorecardProps> = ({
  result,
  activeFilter,
  onFilterChange,
  onOpenDisputeStudio,
  onExportJson,
  isSemanticAuditing = false,
  onRunSemanticAudit,
  hasSemanticResults = false
}) => {
  const { summary } = result;

  const getRiskClass = () => {
    switch (summary.riskLevel) {
      case 'High':
        return 'risk-high';
      case 'Moderate':
        return 'risk-moderate';
      default:
        return 'risk-low';
    }
  };

  return (
    <div>
      <div className="scorecard-bar">
        <div className="scorecard-stats">
          <div className="stat-item">
            <span className="stat-label">Total Clauses</span>
            <span className="stat-val val-total">{summary.totalClauses}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Likely Unenforceable</span>
            <span className="stat-val val-alert">{summary.unenforceableCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Watch Items</span>
            <span className="stat-val val-watch">{summary.watchCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Standard</span>
            <span className="stat-val val-standard">{summary.standardCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Overall Risk</span>
            <span className={`risk-badge ${getRiskClass()}`}>
              {summary.riskLevel} Risk
            </span>
          </div>
        </div>

        <div className="scorecard-actions">
          {onRunSemanticAudit && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onRunSemanticAudit}
              disabled={isSemanticAuditing}
              title="Run client-side semantic analysis for hidden waivers and equitable counter-amendments"
              style={{ borderColor: 'rgba(16, 185, 129, 0.5)', color: '#10b981' }}
            >
              <Zap size={15} color="#10b981" />
              {isSemanticAuditing
                ? 'Running Semantic Audit...'
                : hasSemanticResults
                ? 'Re-Run Semantic Audit'
                : 'Deep Semantic Audit (Edge)'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenDisputeStudio}
          >
            <Mail size={16} />
            Draft Dispute Letter
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onExportJson}
          >
            <Download size={15} />
            Export JSON
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="#38bdf8" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            Audited Clauses for {result.jurisdictionName}
          </h2>
        </div>

        <div className="filter-pills" role="tablist">
          <button
            type="button"
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            All Clauses ({summary.totalClauses})
          </button>
          <button
            type="button"
            className={`filter-pill ${activeFilter === 'LikelyUnenforceable' ? 'active' : ''}`}
            onClick={() => onFilterChange('LikelyUnenforceable')}
          >
            Unenforceable ({summary.unenforceableCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${activeFilter === 'Watch' ? 'active' : ''}`}
            onClick={() => onFilterChange('Watch')}
          >
            Watch ({summary.watchCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${activeFilter === 'Standard' ? 'active' : ''}`}
            onClick={() => onFilterChange('Standard')}
          >
            Standard ({summary.standardCount})
          </button>
          {hasSemanticResults && (
            <button
              type="button"
              className={`filter-pill ${activeFilter === 'SemanticHigh' ? 'active' : ''}`}
              onClick={() => onFilterChange('SemanticHigh')}
              style={{ borderColor: 'rgba(16, 185, 129, 0.5)', color: activeFilter === 'SemanticHigh' ? '#10b981' : undefined }}
            >
              ⚡ Semantic High Risk
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
