import { test, expect } from '@playwright/test';

test.describe('LeaseAudit End-to-End Workflow', () => {

  test('loads home page with persistent disclaimer and zero remote egress', async ({ page }) => {
    // Intercept and assert no external requests are made
    const externalRequests: string[] = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        externalRequests.push(request.url());
      }
    });

    await page.goto('/');

    // Check title & branding
    await expect(page).toHaveTitle(/LeaseAudit/);
    await expect(page.locator('.logo-title')).toHaveText('LeaseAudit');
    await expect(page.locator('.badge-local')).toBeVisible();

    // Check persistent educational disclaimer
    const disclaimer = page.locator('.disclaimer-banner');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText('does not constitute legal advice');

    // Assert zero remote calls
    expect(externalRequests).toHaveLength(0);
  });

  test('runs audit on California lease with statute-grounded results', async ({ page }) => {
    await page.goto('/');

    // 1. Click Sample California Lease button
    await page.click('button[data-sample="ca"]');

    // Verify textarea is populated and CA is selected
    const pasteInput = page.locator('#paste-input');
    await expect(pasteInput).toBeVisible();
    await expect(pasteInput).toHaveValue(/RESIDENTIAL LEASE AGREEMENT/);
    await expect(page.locator('#jurisdiction-select')).toHaveValue('CA');

    // 2. Click "Run Lease Audit"
    await page.click('#btn-run-audit');

    // 3. Wait for Results Section
    const resultsSection = page.locator('#results-section');
    await expect(resultsSection).toBeVisible({ timeout: 10000 });

    // Verify scorecards
    const unenforceableStat = page.locator('#stat-unenforceable');
    await expect(unenforceableStat).not.toHaveText('0');

    // Verify clause cards contain statute citations
    const cards = page.locator('.clause-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(4);

    // Verify specific California statutes cited on cards
    await expect(page.locator('.clause-grid')).toContainText('Cal. Civ. Code § 1950.5');
    await expect(page.locator('.clause-grid')).toContainText('Cal. Civ. Code § 1954');

    // 4. Test Filter Pills
    await page.click('button[data-filter="LikelyUnenforceable"]');
    const visibleCards = page.locator('.clause-card');
    const filteredCount = await visibleCards.count();
    for (let i = 0; i < filteredCount; i++) {
      await expect(visibleCards.nth(i)).toHaveClass(/card-LikelyUnenforceable/);
    }

    // 5. Test Dispute Letter Generation Modal
    await page.click('#btn-open-dispute');
    const modal = page.locator('#dispute-modal');
    await expect(modal).toBeVisible();

    // Fill form inputs
    await page.fill('#input-tenant-name', 'Courtlandt Harris');
    await page.fill('#input-landlord-name', 'Pacific Crest Management');
    await page.fill('#input-property-address', '742 Evergreen Terr, San Francisco, CA');

    // Verify generated preview
    const preview = page.locator('#letter-preview');
    await expect(preview).toContainText('Courtlandt Harris');
    await expect(preview).toContainText('Cal. Civ. Code § 1950.5');
    await expect(preview).toContainText('Proposed Lease Provisions Requiring Statutory Compliance');

    // Close modal
    await page.click('#btn-close-modal');
    await expect(modal).not.toBeVisible();

    // 6. Test "Burn Local Data"
    await page.click('#btn-burn-data');
    await expect(resultsSection).not.toBeVisible();
    await expect(pasteInput).toHaveValue('');
    await expect(page.locator('#toast')).toContainText('All local lease data and session memory purged');
  });

  test('runs audit on New York lease flagging HSTPA deposit & late fee limits', async ({ page }) => {
    await page.goto('/');

    // Load NY sample
    await page.click('button[data-sample="ny"]');
    await expect(page.locator('#jurisdiction-select')).toHaveValue('NY');

    // Run audit
    await page.click('#btn-run-audit');
    await expect(page.locator('#results-section')).toBeVisible({ timeout: 10000 });

    // Verify NY statutes cited
    const grid = page.locator('.clause-grid');
    await expect(grid).toContainText('N.Y. Gen. Oblig. Law § 7-108');
    await expect(grid).toContainText('N.Y. Real Prop. Law § 238-a');
  });

  test('runs audit on Federal baseline flagging Fair Housing Act violations', async ({ page }) => {
    await page.goto('/');

    // Load FED sample
    await page.click('button[data-sample="fed"]');
    await expect(page.locator('#jurisdiction-select')).toHaveValue('FED');

    // Run audit
    await page.click('#btn-run-audit');
    await expect(page.locator('#results-section')).toBeVisible({ timeout: 10000 });

    // Verify Federal statutes cited
    const grid = page.locator('.clause-grid');
    await expect(grid).toContainText('42 U.S.C. § 3604');
    await expect(grid).toContainText('50 U.S.C. § 3955');
  });

});
