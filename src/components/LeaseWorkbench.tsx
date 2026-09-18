import React, { useState, useRef } from 'react';
import { FileText, Upload, Search, Trash2 } from 'lucide-react';
import { JURISDICTION_OPTIONS, SAMPLE_LEASES } from '../data';

interface LeaseWorkbenchProps {
  rawText: string;
  jurisdiction: string;
  onTextChange: (text: string) => void;
  onJurisdictionChange: (jur: string) => void;
  onRunAudit: () => void;
  isLoading: boolean;
}

export const LeaseWorkbench: React.FC<LeaseWorkbenchProps> = ({
  rawText,
  jurisdiction,
  onTextChange,
  onJurisdictionChange,
  onRunAudit,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setUploadedFileName(null);
    onTextChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadSample = (key: 'ca' | 'ny' | 'fed') => {
    const sample = SAMPLE_LEASES[key];
    if (sample) {
      onTextChange(sample.text);
      onJurisdictionChange(sample.jurisdiction);
      setActiveTab('paste');
      setUploadedFileName(null);
    }
  };

  return (
    <section className="workspace-card" aria-labelledby="workspace-heading">
      <div className="workspace-header">
        <div className="workspace-title-group">
          <h1 id="workspace-heading">Residential Lease Audit</h1>
          <p className="workspace-desc">
            Upload or paste your residential lease to audit clauses against active state & federal landlord-tenant statutes.
          </p>
        </div>

        <div className="jurisdiction-control">
          <label htmlFor="jurisdiction-select">Select Governing Jurisdiction</label>
          <select
            id="jurisdiction-select"
            className="select-input"
            value={jurisdiction}
            onChange={(e) => onJurisdictionChange(e.target.value)}
          >
            {JURISDICTION_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ingest-tabs" role="tablist">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
          role="tab"
          aria-selected={activeTab === 'paste'}
        >
          Paste Lease Text
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
          role="tab"
          aria-selected={activeTab === 'upload'}
        >
          Upload Document (TXT / Text)
        </button>
      </div>

      {activeTab === 'paste' ? (
        <div>
          <label htmlFor="lease-paste-input" className="sr-only">
            Paste complete lease agreement text here
          </label>
          <textarea
            id="lease-paste-input"
            className="paste-textarea"
            value={rawText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste your complete lease agreement text here (e.g. Sections, Security Deposit terms, Late Fees, Access provisions)..."
          />
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            accept=".txt,.text,.md"
            className="sr-only"
            onChange={handleFileChange}
          />
          {!uploadedFileName ? (
            <div
              className="dropzone"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
              tabIndex={0}
              role="button"
              aria-label="Upload lease file"
            >
              <Upload size={32} color="#38bdf8" />
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Click to browse or drop lease document
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                100% Client-Side Local Execution • Zero Network Transmission
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: '8px',
                border: '1px solid var(--border-medium)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#38bdf8" />
                <span style={{ fontWeight: 600 }}>{uploadedFileName}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ({rawText.length.toLocaleString()} characters)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={handleClearFile}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          )}
        </div>
      )}

      <div className="sample-bar">
        <div className="sample-buttons">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Load Reality Samples:</span>
          <button
            type="button"
            className="btn-sample"
            onClick={() => handleLoadSample('ca')}
            title="California lease with AB 12 2-month deposit, 60-day return, habitability waiver, lockout"
          >
            California (AB 12)
          </button>
          <button
            type="button"
            className="btn-sample"
            onClick={() => handleLoadSample('ny')}
            title="New York lease with HSTPA 2-month deposit, 15% late fee, padlocks"
          >
            New York (HSTPA)
          </button>
          <button
            type="button"
            className="btn-sample"
            onClick={() => handleLoadSample('fed')}
            title="Federal lease with Fair Housing familial & service animal discrimination and SCRA waiver"
          >
            Federal Baseline
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onRunAudit}
          disabled={isLoading || !rawText.trim()}
        >
          <Search size={16} />
          {isLoading ? 'Auditing Against Statutes...' : 'Run Lease Audit'}
        </button>
      </div>
    </section>
  );
};
