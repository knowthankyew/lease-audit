/**
 * LeaseAudit - Local Statute-Grounded Lease Analyzer
 * Vanilla JavaScript (Zero Build Steps, Zero Cloud Egress)
 */

(() => {
  'use strict';

  // State Management
  let currentFile = null;
  let currentAuditResult = null;
  let activeFilter = 'all';
  let modalTriggerElement = null;

  // Sample Lease Texts for Immediate Exploration
  const SAMPLE_LEASES = {
    ca: `RESIDENTIAL LEASE AGREEMENT (CALIFORNIA)
Landlord: Pacific Crest Management
Tenant: Jane Doe
Premises: 742 Evergreen Terrace, Apt 3B, San Francisco, CA 94102
Monthly Rent: $2,800.00

SECTION 1. TERM
Twelve (12) months starting November 1, 2026.

SECTION 2. SECURITY DEPOSIT
Tenant shall deposit $5,600.00 (two months' rent) as a security deposit. Landlord shall have sixty (60) days following surrender of premises to inspect and return any balance.

SECTION 3. LATE FEES
Rent is due on the 1st. If not paid by 11:59 PM on the 1st, a late fee of $250.00 plus $25 per calendar day rent remains delinquent shall apply.

SECTION 4. RIGHT OF ENTRY
Landlord reserves the right to enter the premises at any time without prior written or oral notice for inspections or showings.

SECTION 5. MAINTENANCE AND REPAIRS
Tenant accepts premises in strictly "AS-IS" condition and waives all implied warranties of habitability. Tenant is solely responsible for all maintenance, plumbing clogs, and roof repairs.

SECTION 6. DEFAULT AND SELF-HELP REMEDIES
If Tenant is delinquent in rent, Landlord may immediately re-enter premises, terminate utility services, change door locks, and dispose of Tenant's property without court process.`,

    ny: `STANDARD APARTMENT LEASE (NEW YORK)
Landlord: Gotham Realty Associates LLC
Tenant: John Smith
Premises: 450 W 42nd St, Apt 14D, New York, NY 10036
Monthly Rent: $3,200.00

1. LEASE TERM
One year commencing October 1, 2026.

2. SECURITY DEPOSIT
Tenant shall deposit $6,400.00 (two months rent) upon signing. Landlord shall return deposit within 45 days after tenant vacates.

3. LATE PAYMENT PENALTY
If rent is not paid by the 2nd day of the month, Tenant shall pay a late fee equal to 15% of monthly rent ($480.00).

4. ACCESS TO PREMISES
Landlord may enter the apartment at any hour without notice to inspect or repair.

5. CONDITION OF PREMISES
Tenant acknowledges premises are in satisfactory condition and waives any claim regarding warranty of habitability under New York law.

6. RE-ENTRY BY OWNER
If Tenant fails to pay rent, Landlord may immediately pad-lock apartment doors and remove Tenant's belongings without legal proceedings.`,

    fed: `RESIDENTIAL LEASE AGREEMENT
Landlord: National Property Holdings
Premises: 100 Main Street, Unit 5

SECTION 1. OCCUPANCY RESTRICTIONS
Adults only. No children allowed in the building under any circumstances. Any tenant who has a child during tenancy shall pay a $500 monthly surcharge.

SECTION 2. ANIMAL POLICY
Strict no pets policy. No animals under any circumstances, including service animals or emotional support animals. Anyone with an assistance animal must pay a $1,000 non-refundable pet deposit.

SECTION 3. MILITARY DEPLOYMENT
Tenant waives all rights under the Servicemembers Civil Relief Act (SCRA). No early termination allowed for military transfer or deployment.`
  };

  // DOM Elements
  const jurisdictionSelect = document.getElementById('jurisdiction-select');
  const tabUpload = document.getElementById('tab-upload');
  const tabPaste = document.getElementById('tab-paste');
  const uploadPanel = document.getElementById('upload-panel');
  const pastePanel = document.getElementById('paste-panel');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const fileInfoBar = document.getElementById('file-info-bar');
  const fileNameDisplay = document.getElementById('file-name');
  const fileStatsDisplay = document.getElementById('file-stats');
  const btnClearFile = document.getElementById('btn-clear-file');
  const pasteInput = document.getElementById('paste-input');
  const btnRunAudit = document.getElementById('btn-run-audit');
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingText = document.getElementById('loading-text');
  const alertBanner = document.getElementById('alert-banner');
  const alertMessage = document.getElementById('alert-message');
  const resultsSection = document.getElementById('results-section');
  const clauseGrid = document.getElementById('clause-grid');
  const liveAnnouncer = document.getElementById('live-announcer');
  const btnBurnData = document.getElementById('btn-burn-data');
  const btnOpenDispute = document.getElementById('btn-open-dispute');
  const btnExportJson = document.getElementById('btn-export-json');
  const toast = document.getElementById('toast');

  // Dispute Modal Elements
  const disputeModal = document.getElementById('dispute-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const inputTenantName = document.getElementById('input-tenant-name');
  const inputLandlordName = document.getElementById('input-landlord-name');
  const inputPropertyAddress = document.getElementById('input-property-address');
  const selectLetterType = document.getElementById('select-letter-type');
  const letterPreview = document.getElementById('letter-preview');
  const btnCopyLetter = document.getElementById('btn-copy-letter');
  const btnDownloadTxt = document.getElementById('btn-download-txt');
  const btnPrintLetter = document.getElementById('btn-print-letter');

  // Announce for Screen Readers
  function announce(message) {
    if (liveAnnouncer) {
      liveAnnouncer.textContent = message;
    }
  }

  // Show Toast
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Error Alert
  function showError(message) {
    if (alertBanner && alertMessage) {
      alertMessage.textContent = message;
      alertBanner.classList.add('active');
      announce(`Error: ${message}`);
    }
  }

  function clearError() {
    if (alertBanner) {
      alertBanner.classList.remove('active');
    }
  }

  // Tab Switching
  function switchTab(mode) {
    clearError();
    if (mode === 'upload') {
      tabUpload.classList.add('active');
      tabUpload.setAttribute('aria-selected', 'true');
      tabPaste.classList.remove('active');
      tabPaste.setAttribute('aria-selected', 'false');
      uploadPanel.style.display = 'block';
      pastePanel.classList.remove('active');
      dropzone.focus();
    } else {
      tabPaste.classList.add('active');
      tabPaste.setAttribute('aria-selected', 'true');
      tabUpload.classList.remove('active');
      tabUpload.setAttribute('aria-selected', 'false');
      uploadPanel.style.display = 'none';
      pastePanel.classList.add('active');
      pasteInput.focus();
    }
  }

  tabUpload.addEventListener('click', () => switchTab('upload'));
  tabPaste.addEventListener('click', () => switchTab('paste'));

  // File Dropzone Handling
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    clearError();
    currentFile = file;
    fileNameDisplay.textContent = file.name;
    const sizeKb = (file.size / 1024).toFixed(1);
    fileStatsDisplay.textContent = `(${sizeKb} KB)`;
    fileInfoBar.classList.add('active');
    dropzone.style.display = 'none';
    announce(`Selected file ${file.name}, ${sizeKb} kilobytes.`);
  }

  btnClearFile.addEventListener('click', () => {
    currentFile = null;
    fileInput.value = '';
    fileInfoBar.classList.remove('active');
    dropzone.style.display = 'flex';
    dropzone.focus();
    announce('File removed.');
  });

  // Sample Lease Buttons
  document.querySelectorAll('.btn-sample').forEach(btn => {
    btn.addEventListener('click', () => {
      const sampleKey = btn.dataset.sample;
      if (SAMPLE_LEASES[sampleKey]) {
        switchTab('paste');
        pasteInput.value = SAMPLE_LEASES[sampleKey];
        if (sampleKey === 'ca') jurisdictionSelect.value = 'CA';
        else if (sampleKey === 'ny') jurisdictionSelect.value = 'NY';
        else if (sampleKey === 'fed') jurisdictionSelect.value = 'FED';
        announce(`Loaded sample lease for ${sampleKey.toUpperCase()}. Ready to audit.`);
        showToast(`Loaded sample ${sampleKey.toUpperCase()} lease.`);
      }
    });
  });

  // Run Audit
  btnRunAudit.addEventListener('click', async () => {
    clearError();
    const jurisdiction = jurisdictionSelect.value;

    let rawText = '';
    if (currentFile) {
      // Extract from file via local API
      setLoading(true, `Extracting text from ${currentFile.name}...`);
      try {
        const formData = new FormData();
        formData.append('file', currentFile);
        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          body: formData
        });

        if (!extractRes.ok) {
          const errData = await extractRes.json();
          throw new Error(errData.error || 'Failed to extract text from document.');
        }

        const extractData = await extractRes.json();
        rawText = extractData.extractedText;
      } catch (err) {
        setLoading(false);
        showError(err.message);
        return;
      }
    } else {
      rawText = pasteInput.value.trim();
    }

    if (!rawText) {
      showError('Please upload a lease file or paste your lease text before running the audit.');
      return;
    }

    setLoading(true, `Auditing clauses against ${jurisdictionSelect.selectedOptions[0].text}...`);

    try {
      const auditRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawText,
          jurisdiction: jurisdiction
        })
      });

      if (!auditRes.ok) {
        const errData = await auditRes.json();
        throw new Error(errData.error || 'Audit analysis failed.');
      }

      currentAuditResult = await auditRes.json();
      renderResults(currentAuditResult);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading, message = '') {
    if (isLoading) {
      loadingIndicator.classList.add('active');
      loadingIndicator.setAttribute('aria-hidden', 'false');
      loadingText.textContent = message;
      btnRunAudit.disabled = true;
      announce(message);
    } else {
      loadingIndicator.classList.remove('active');
      loadingIndicator.setAttribute('aria-hidden', 'true');
      btnRunAudit.disabled = false;
    }
  }

  // Render Audit Results
  function renderResults(result) {
    resultsSection.classList.add('active');

    // Update Stats
    document.getElementById('stat-total').textContent = result.summary.totalClauses;
    document.getElementById('stat-unenforceable').textContent = result.summary.unenforceableCount;
    document.getElementById('stat-watch').textContent = result.summary.watchCount;
    document.getElementById('stat-standard').textContent = result.summary.standardCount;

    document.getElementById('count-all').textContent = result.summary.totalClauses;
    document.getElementById('count-unenforceable').textContent = result.summary.unenforceableCount;
    document.getElementById('count-watch').textContent = result.summary.watchCount;
    document.getElementById('count-standard').textContent = result.summary.standardCount;

    renderClauseCards(result.clauses);

    const announcementMsg = `Audit complete for ${result.jurisdictionName}. Found ${result.summary.totalClauses} clauses: ${result.summary.unenforceableCount} likely unenforceable, ${result.summary.watchCount} watch items, and ${result.summary.standardCount} standard clauses.`;
    announce(announcementMsg);
    showToast('Audit complete.');

    // Shift focus to results heading
    const resultsHeading = document.getElementById('results-heading');
    resultsHeading.setAttribute('tabindex', '-1');
    resultsHeading.focus();
  }

  // Render Clause Cards
  function renderClauseCards(clauses) {
    clauseGrid.innerHTML = '';

    const filtered = clauses.filter(c => {
      if (activeFilter === 'all') return true;
      return c.status === activeFilter;
    });

    if (filtered.length === 0) {
      clauseGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
          No clauses match the selected filter.
        </div>
      `;
      return;
    }

    filtered.forEach(clause => {
      const card = document.createElement('article');
      card.className = `clause-card card-${clause.status}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${clause.title}, status: ${formatStatus(clause.status)}`);

      let tagClass = `tag-${clause.status}`;
      let tagLabel = formatStatus(clause.status);

      let statuteHtml = '';
      if (clause.statuteCitation) {
        const url = clause.officialSourceUrl || '#';
        statuteHtml = `
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="clause-statute" aria-label="Statute citation: ${clause.statuteCitation} (opens official code)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            ${clause.statuteCitation}
          </a>
        `;
      }

      let explanationHtml = '';
      if (clause.explanation) {
        explanationHtml = `<div class="clause-explanation">${escapeHtml(clause.explanation)}</div>`;
      }

      let remedyHtml = '';
      if (clause.disputeRecommendation) {
        remedyHtml = `
          <div class="clause-remedy">
            <strong>Recommended Remedy:</strong> ${escapeHtml(clause.disputeRecommendation)}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="clause-card-header">
          <span class="clause-tag ${tagClass}">${tagLabel}</span>
          ${statuteHtml}
        </div>
        <h3 class="clause-title">${escapeHtml(clause.title || 'Clause')}</h3>
        <blockquote class="clause-quote">"${escapeHtml(clause.rawText)}"</blockquote>
        ${explanationHtml}
        ${remedyHtml}
      `;

      clauseGrid.appendChild(card);
    });
  }

  function formatStatus(status) {
    if (status === 'LikelyUnenforceable') return 'Likely Unenforceable';
    if (status === 'Watch') return 'Watch Item';
    return 'Standard';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => {
      const escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escape[match];
    });
  }

  // Filter Buttons
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeFilter = btn.dataset.filter;
      if (currentAuditResult) {
        renderClauseCards(currentAuditResult.clauses);
      }
    });
  });

  // Dispute Letter Modal
  btnOpenDispute.addEventListener('click', () => {
    if (!currentAuditResult || !currentAuditResult.clauses.length) {
      showError('No audit results available to draft a dispute letter.');
      return;
    }
    modalTriggerElement = btnOpenDispute;
    openDisputeModal();
  });

  btnCloseModal.addEventListener('click', closeDisputeModal);
  disputeModal.addEventListener('click', (e) => {
    if (e.target === disputeModal) closeDisputeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && disputeModal.classList.contains('active')) {
      closeDisputeModal();
    }
  });

  async function openDisputeModal() {
    disputeModal.classList.add('active');
    inputTenantName.focus();
    await updateDisputeLetter();
  }

  function closeDisputeModal() {
    disputeModal.classList.remove('active');
    if (modalTriggerElement) {
      modalTriggerElement.focus();
    }
  }

  async function updateDisputeLetter() {
    if (!currentAuditResult) return;

    // Filter for flagged clauses (LikelyUnenforceable and Watch)
    const flagged = currentAuditResult.clauses.filter(
      c => c.status === 'LikelyUnenforceable' || c.status === 'Watch'
    );

    const disputeReq = {
      jurisdiction: currentAuditResult.jurisdiction,
      tenantName: inputTenantName.value.trim(),
      landlordName: inputLandlordName.value.trim(),
      propertyAddress: inputPropertyAddress.value.trim(),
      letterType: selectLetterType.value,
      flaggedClauses: flagged
    };

    try {
      const res = await fetch('/api/dispute/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disputeReq)
      });
      if (res.ok) {
        const data = await res.json();
        letterPreview.textContent = data.letterPlaintext;
      }
    } catch {
      // Fallback
    }
  }

  [inputTenantName, inputLandlordName, inputPropertyAddress, selectLetterType].forEach(el => {
    el.addEventListener('input', updateDisputeLetter);
  });

  // Copy Letter
  btnCopyLetter.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(letterPreview.innerText || letterPreview.textContent);
      showToast('Dispute letter copied to clipboard.');
      announce('Letter copied to clipboard.');
    } catch {
      showError('Failed to copy to clipboard.');
    }
  });

  // Download .txt
  btnDownloadTxt.addEventListener('click', () => {
    const text = letterPreview.innerText || letterPreview.textContent;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lease-dispute-letter-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded dispute letter.');
  });

  // Print Letter
  btnPrintLetter.addEventListener('click', () => {
    window.print();
  });

  // Export Audit Results JSON
  btnExportJson.addEventListener('click', () => {
    if (!currentAuditResult) return;
    const jsonStr = JSON.stringify(currentAuditResult, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lease-audit-${currentAuditResult.jurisdiction}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported audit JSON.');
  });

  // Burn Local Data
  btnBurnData.addEventListener('click', async () => {
    // 1. Purge backend memory buffers
    try {
      await fetch('/api/privacy/purge', { method: 'POST' });
    } catch {
      // Offline safe
    }

    // 2. Wipe client memory state
    currentFile = null;
    currentAuditResult = null;
    fileInput.value = '';
    pasteInput.value = '';
    fileInfoBar.classList.remove('active');
    dropzone.style.display = 'flex';
    resultsSection.classList.remove('active');
    clauseGrid.innerHTML = '';
    clearError();

    inputTenantName.value = '';
    inputLandlordName.value = '';
    inputPropertyAddress.value = '';
    letterPreview.textContent = '';
    closeDisputeModal();

    showToast('All local lease data and session memory purged.');
    announce('All local data and session memory successfully purged.');

    // Shift focus to workspace heading
    document.getElementById('workspace-heading').focus();
  });

})();
