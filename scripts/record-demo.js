const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Require chromium from tests/LeaseAudit.E2E
const { chromium } = require(path.join(__dirname, '..', 'tests', 'LeaseAudit.E2E', 'node_modules', '@playwright', 'test'));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const repoRoot = path.resolve(__dirname, '..');
  const tempVideoDir = path.join(repoRoot, '.temp_demo_videos');
  if (!fs.existsSync(tempVideoDir)) fs.mkdirSync(tempVideoDir, { recursive: true });

  const destMp4 = path.join(repoRoot, 'demo.mp4');
  const destGif = path.join(repoRoot, 'demo.gif');

  console.log('🎬 Launching Playwright browser for automated LeaseAudit demo recording...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1366,860']
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1366, height: 860 }
    }
  });

  const page = await context.newPage();

  console.log('Step 1: Navigating to LeaseAudit UI (http://localhost:5173)...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await sleep(1500);

  console.log('Step 2: Loading California Sample Lease with Predatory Clauses...');
  await page.click('button[data-sample="ca"]');
  await sleep(1500);

  console.log('Step 3: Initiating Local Statute-Grounded Audit...');
  await page.click('#btn-run-audit');
  await page.waitForSelector('#results-section.active', { state: 'visible', timeout: 10000 });
  await sleep(2000);

  console.log('Step 4: Inspecting Risk Scorecards and Stat Badges...');
  await page.evaluate(() => window.scrollBy({ top: 220, behavior: 'smooth' }));
  await sleep(2500);

  console.log('Step 5: Filtering for Likely Unenforceable Clauses...');
  await page.click('button[data-filter="LikelyUnenforceable"]');
  await sleep(2000);

  console.log('Step 6: Showcasing Cal. Civ. Code § 1950.5 and § 1954 Citations...');
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
  await sleep(2500);

  console.log('Step 7: Opening Interactive Dispute Letter Generator...');
  await page.evaluate(() => window.scrollTo({ top: 180, behavior: 'smooth' }));
  await sleep(1000);
  await page.click('#btn-open-dispute');
  await page.waitForSelector('#dispute-modal.active', { state: 'visible', timeout: 5000 });
  await sleep(1500);

  console.log('Step 8: Customizing Tenant, Landlord, and Address fields...');
  await page.fill('#input-tenant-name', 'Courtlandt Harris');
  await sleep(800);
  await page.fill('#input-landlord-name', 'Pacific Crest Management LLC');
  await sleep(800);
  await page.fill('#input-property-address', '742 Evergreen Terrace, Apt 3B, San Francisco, CA');
  await sleep(2500);

  console.log('Step 9: Demonstrating 1-Click Copy with Toast Notification...');
  await page.click('#btn-copy-letter');
  await sleep(1800);

  // Close Dispute Modal
  await page.click('#btn-close-modal');
  await sleep(1200);

  console.log('Step 10: Demonstrating "Burn Local Data" Session Memory Wiping...');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(1000);
  await page.click('#btn-burn-data');
  await sleep(2500);

  console.log('Step 11: Loading New York Sample Lease (HSTPA & Roommate Law)...');
  await page.click('button[data-sample="ny"]');
  await sleep(1200);
  await page.click('#btn-run-audit');
  await page.waitForSelector('#results-section.active', { state: 'visible', timeout: 10000 });
  await sleep(2000);

  await page.evaluate(() => window.scrollBy({ top: 260, behavior: 'smooth' }));
  await sleep(3000);

  console.log('Closing browser and finalizing video stream...');
  await page.close();
  await context.close();
  await browser.close();

  // Find recorded WebM
  const videoFiles = fs.readdirSync(tempVideoDir).filter(f => f.endsWith('.webm'));
  if (videoFiles.length === 0) {
    console.error('❌ Error: No recorded WebM video found.');
    return;
  }

  const latestVideo = path.join(tempVideoDir, videoFiles[videoFiles.length - 1]);

  // Locate ffmpeg
  const candidateFfmpeg = [
    '/Users/cl0rkster/Dev/ml/src/FtaaSService.Worker/.venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-x86_64-v7.1',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg'
  ];

  let ffmpegPath = null;
  for (const p of candidateFfmpeg) {
    if (fs.existsSync(p)) {
      ffmpegPath = p;
      break;
    }
  }

  if (ffmpegPath) {
    try {
      console.log(`🎬 Transcoding recording to web-standard MP4 (H.264 / yuv420p) using ${ffmpegPath}...`);
      execSync(`"${ffmpegPath}" -y -i "${latestVideo}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${destMp4}"`, { stdio: 'inherit' });
      const stats = fs.statSync(destMp4);
      console.log(`✓ Demo MP4 successfully generated: ${destMp4} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

      console.log(`🎬 Generating animated demo.gif for GitHub README preview...`);
      execSync(`"${ffmpegPath}" -y -i "${destMp4}" -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${destGif}"`, { stdio: 'inherit' });
      const gifStats = fs.statSync(destGif);
      console.log(`✓ Demo GIF successfully generated: ${destGif} (${(gifStats.size / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (err) {
      console.warn('⚠️ FFmpeg conversion encountered an error, falling back to copy:', err.message);
      fs.copyFileSync(latestVideo, destMp4);
    }
  } else {
    console.warn('⚠️ FFmpeg binary not detected. Retaining raw WebM recording as demo.mp4.');
    fs.copyFileSync(latestVideo, destMp4);
  }

  // Cleanup temp dir
  fs.rmSync(tempVideoDir, { recursive: true, force: true });
  console.log('✨ Demo recording complete!');
})();
