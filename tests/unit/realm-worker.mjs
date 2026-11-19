import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { rolldown } from 'rolldown';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTRY_PATH = resolve(HERE, '../../src/core/telemetry.ts');
let bundlePromise = null;

async function getBundleCode() {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const bundle = await rolldown({ input: ENTRY_PATH });
      try {
        const generated = await bundle.generate({ format: 'es', codeSplitting: false });
        return generated.output[0].code;
      } finally {
        await bundle.close();
      }
    })();
  }
  return bundlePromise;
}

export async function runTelemetryInFreshRealm(scenarioBody) {
  const bundleCode = await getBundleCode();
  const workerSource = `
const { parentPort, workerData } = require('node:worker_threads');
const assert = require('node:assert/strict');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

(async () => {
  try {
    const mod = await import('data:text/javascript;base64,' + Buffer.from(workerData.bundleCode, 'utf8').toString('base64'));
    const fn = new AsyncFunction('telemetryMod', 'assert', workerData.scenarioBody);
    await fn(mod, assert);
    parentPort.postMessage({ ok: true });
  } catch (err) {
    parentPort.postMessage({ ok: false, error: err && err.stack ? err.stack : String(err) });
  }
})();
`;

  const outcome = await new Promise((resolvePromise, rejectPromise) => {
    const worker = new Worker(workerSource, {
      eval: true,
      workerData: { bundleCode, scenarioBody },
    });
    let settled = false;
    worker.once('message', (msg) => {
      settled = true;
      void worker.terminate().finally(() => resolvePromise(msg));
    });
    worker.once('error', (err) => {
      if (!settled) {
        settled = true;
        void worker.terminate().finally(() => rejectPromise(err));
      }
    });
    worker.once('exit', (code) => {
      if (!settled) {
        settled = true;
        rejectPromise(new Error(`Realm worker exited unexpectedly with code ${code}`));
      }
    });
  });

  if (!outcome.ok) {
    throw new Error(outcome.error || 'Isolated telemetry realm test failed');
  }
}
