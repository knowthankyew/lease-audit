import React, { useState, useMemo } from 'react';
import { Clause, LetterType } from '../contracts';
import { DisputeLetterGenerator } from '../core';
import { X, Copy, Download, Printer, Check } from 'lucide-react';

interface DisputeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  flaggedClauses: Clause[];
  jurisdiction: string;
  onCopySuccess: () => void;
}

export const DisputeStudioModal: React.FC<DisputeStudioModalProps> = ({
  isOpen,
  onClose,
  flaggedClauses,
  jurisdiction,
  onCopySuccess
}) => {
  const [tenantName, setTenantName] = useState<string>('Jane Doe');
  const [landlordName, setLandlordName] = useState<string>('Property Management LLC');
  const [propertyAddress, setPropertyAddress] = useState<string>('123 Main St, Apt 4B');
  const [letterType, setLetterType] = useState<LetterType>('PreSigning');
  const [copied, setCopied] = useState<boolean>(false);

  const generator = useMemo(() => new DisputeLetterGenerator(), []);

  const disputeResult = useMemo(() => {
    return generator.generateLetter({
      jurisdiction,
      tenantName,
      landlordName,
      propertyAddress,
      letterType,
      flaggedClauses
    });
  }, [generator, jurisdiction, tenantName, landlordName, propertyAddress, letterType, flaggedClauses]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(disputeResult.letterPlaintext);
      setCopied(true);
      onCopySuccess();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([disputeResult.letterPlaintext], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lease-dispute-letter-${jurisdiction.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lease Statutory Notice - ${tenantName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
          h1, h2, h3, h4 { color: #000; margin-top: 1.5em; margin-bottom: 0.5em; }
          blockquote { border-left: 3px solid #ccc; margin: 1em 0; padding-left: 1em; color: #444; font-style: italic; }
          hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap; font-family: inherit;">${disputeResult.letterPlaintext}</pre>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dispute-title">
      <div className="modal-container">
        <div className="modal-header">
          <h2 id="dispute-title" className="modal-title">Draft Statutory Amendment & Dispute Notice</h2>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Flagged clauses and governing statutory citations are automatically compiled. Customize the tenant,
            landlord, and address below to generate a finalized formal notice.
          </p>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="input-tenant-name">Tenant Full Name</label>
              <input
                id="input-tenant-name"
                type="text"
                className="form-input"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="input-landlord-name">Landlord / Property Management</label>
              <input
                id="input-landlord-name"
                type="text"
                className="form-input"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="input-property-address">Rental Property Address</label>
              <input
                id="input-property-address"
                type="text"
                className="form-input"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="select-letter-type">Notice Purpose</label>
              <select
                id="select-letter-type"
                className="form-input"
                value={letterType}
                onChange={(e) => setLetterType(e.target.value as LetterType)}
              >
                <option value="PreSigning">Pre-Signing Amendment Request (Before Execution)</option>
                <option value="TenancyDispute">Formal Notice of Unenforceability (Active Tenancy)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Generated Notice Preview ({flaggedClauses.length} clauses included, {disputeResult.statutesCited.length} statutes cited)
            </label>
          </div>

          <div className="letter-preview" tabIndex={0} aria-label="Dispute letter preview">
            {disputeResult.letterPlaintext}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleCopy}>
            {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
            {copied ? 'Copied to Clipboard!' : 'Copy Letter'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleDownload}>
            <Download size={16} />
            Download .txt
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};
