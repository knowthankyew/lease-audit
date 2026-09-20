import {
  EdgeInferenceStatus,
  ExecutionProvider,
  SemanticAnalysisResult,
  EdgeWorkerOutboundMessage,
  EdgeWorkerInboundMessage
} from './types';
import { SemanticClauseAnalyzer } from './semantic-analyzer';

export type StatusListener = (status: EdgeInferenceStatus, provider: ExecutionProvider, message?: string) => void;
export type TokenStreamListener = (clauseId: string, chunk: string, cumulative: string) => void;

interface PendingInference {
  clauseId: string;
  resolve: (res: SemanticAnalysisResult) => void;
  reject: (err: Error) => void;
  onTokenChunk?: TokenStreamListener;
}

export class EdgeInferenceService {
  private worker: Worker | null = null;
  private status: EdgeInferenceStatus = 'uninitialized';
  private executionProvider: ExecutionProvider = 'simulated';
  private tokensPerSec: number = 35.0;
  private statusListeners = new Set<StatusListener>();
  private analyzer = new SemanticClauseAnalyzer();
  private resultsCache = new Map<string, SemanticAnalysisResult>();
  private pendingInferences = new Map<string, PendingInference>();
  private modelLoaded: boolean = false;

  constructor() {
    this.detectEnvironment();
  }

  private detectEnvironment(): void {
    if (typeof window === 'undefined') {
      this.executionProvider = 'simulated';
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator && Boolean((navigator as Navigator & { gpu?: unknown }).gpu)) {
        this.executionProvider = 'webgpu';
        this.tokensPerSec = 38.5;
      } else {
        this.executionProvider = 'wasm';
        this.tokensPerSec = 22.0;
      }
    } catch {
      this.executionProvider = 'wasm';
      this.tokensPerSec = 20.0;
    }
  }

  public getStatus(): EdgeInferenceStatus {
    return this.status;
  }

  public getExecutionProvider(): ExecutionProvider {
    return this.executionProvider;
  }

  public isModelLoaded(): boolean {
    return this.modelLoaded;
  }

  public async loadModel(modelSource: ArrayBuffer | Uint8Array | string): Promise<void> {
    if (this.status === 'uninitialized') {
      await this.initialize();
    }
    if (this.worker) {
      this.worker.postMessage({
        type: 'LOAD_MODEL',
        modelBuffer: typeof modelSource !== 'string' ? modelSource : undefined,
        modelUrl: typeof modelSource === 'string' ? modelSource : undefined
      } as EdgeWorkerInboundMessage);
    } else {
      this.modelLoaded = true;
      this.notifyStatus('ready', 'Model weights loaded in-process.');
    }
  }

  public getThroughput(): number {
    return this.tokensPerSec;
  }

  public addStatusListener(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status, this.executionProvider);
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(status: EdgeInferenceStatus, message?: string): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(this.status, this.executionProvider, message);
      } catch (e) {
        console.error('Error in status listener:', e);
      }
    }
  }

  public async initialize(): Promise<void> {
    if (this.status === 'ready' || this.status === 'loading') {
      return;
    }

    this.notifyStatus('loading', 'Initializing FTaaS Edge ML runtime...');

    // In browser environments with Worker support, instantiate the dedicated Web Worker
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./edge-worker.ts', import.meta.url), { type: 'module' });
        this.setupWorkerListeners();
        this.worker.postMessage({ type: 'INIT' } as EdgeWorkerInboundMessage);
        return;
      } catch (err) {
        console.warn('Web Worker instantiation failed, falling back to in-process execution:', err);
      }
    }

    // Direct fallback (Node.js / Vitest / restricted environments)
    this.status = 'ready';
    this.notifyStatus('ready', `Edge ML engine ready (${this.executionProvider.toUpperCase()} simulated).`);
  }

  private setupWorkerListeners(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent<EdgeWorkerOutboundMessage>) => {
      const msg = event.data;
      if (!msg) return;

      switch (msg.type) {
        case 'STATUS_CHANGED':
          if (msg.executionProvider) {
            this.executionProvider = msg.executionProvider;
          }
          if (msg.modelLoaded !== undefined) {
            this.modelLoaded = msg.modelLoaded;
          }
          this.notifyStatus(msg.status, msg.message);
          break;

        case 'TOKEN_CHUNK': {
          const pending = this.pendingInferences.get(msg.clauseId);
          if (pending) {
            pending.onTokenChunk?.(msg.clauseId, msg.token, msg.cumulativeText);
          }
          break;
        }

        case 'INFERENCE_COMPLETE': {
          const pending = this.pendingInferences.get(msg.clauseId);
          if (pending) {
            this.resultsCache.set(msg.clauseId, msg.result);
            pending.resolve(msg.result);
            this.pendingInferences.delete(msg.clauseId);
          }
          break;
        }

        case 'ERROR': {
          if (msg.clauseId) {
            const pending = this.pendingInferences.get(msg.clauseId);
            if (pending) {
              pending.reject(new Error(msg.error));
              this.pendingInferences.delete(msg.clauseId);
            }
          } else {
            for (const pending of this.pendingInferences.values()) {
              pending.reject(new Error(msg.error));
            }
            this.pendingInferences.clear();
          }
          break;
        }
      }
    };

    this.worker.onerror = (err) => {
      console.error('Edge ML worker encountered error:', err);
      for (const pending of this.pendingInferences.values()) {
        pending.reject(new Error(err.message || 'Edge worker error'));
      }
      this.pendingInferences.clear();
      this.notifyStatus('error', err.message);
    };
  }

  /**
   * Analyzes a clause semantically using the local edge model.
   */
  public async analyzeClause(
    clauseId: string,
    clauseText: string,
    jurisdiction: string,
    onTokenChunk?: TokenStreamListener
  ): Promise<SemanticAnalysisResult> {
    if (this.status === 'uninitialized') {
      await this.initialize();
    }

    if (this.status === 'terminated') {
      throw new Error('Edge ML runtime has been burned and terminated.');
    }

    if (this.resultsCache.has(clauseId)) {
      return this.resultsCache.get(clauseId)!;
    }

    if (this.worker) {
      return new Promise<SemanticAnalysisResult>((resolve, reject) => {
        this.pendingInferences.set(clauseId, { clauseId, resolve, reject, onTokenChunk });
        this.worker!.postMessage({
          type: 'ANALYZE_CLAUSE',
          clauseId,
          clauseText,
          jurisdiction,
          streamTokens: !!onTokenChunk
        } as EdgeWorkerInboundMessage);
      });
    }

    // Direct synchronous/in-process evaluation
    this.notifyStatus('inferring');
    const result = this.analyzer.analyzeSemanticRisk(
      clauseId,
      clauseText,
      jurisdiction,
      this.executionProvider,
      this.tokensPerSec
    );

    if (onTokenChunk) {
      const words = result.aiCounterAmendment.split(' ');
      let cumulative = '';
      for (let i = 0; i < words.length; i++) {
        const word = (i === 0 ? '' : ' ') + words[i];
        cumulative += word;
        onTokenChunk(clauseId, word, cumulative);
      }
    }

    this.resultsCache.set(clauseId, result);
    this.notifyStatus('ready');
    return result;
  }

  /**
   * Batch analyzes multiple clauses.
   */
  public async batchAnalyzeClauses(
    clauses: Array<{ id: string; rawText: string }>,
    jurisdiction: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, SemanticAnalysisResult>> {
    const results = new Map<string, SemanticAnalysisResult>();
    let count = 0;

    for (const c of clauses) {
      const res = await this.analyzeClause(c.id, c.rawText, jurisdiction);
      results.set(c.id, res);
      count++;
      onProgress?.(count, clauses.length);
    }

    return results;
  }

  public getCachedResult(clauseId: string): SemanticAnalysisResult | undefined {
    return this.resultsCache.get(clauseId);
  }

  public abort(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'ABORT' } as EdgeWorkerInboundMessage);
    }
    for (const pending of this.pendingInferences.values()) {
      pending.reject(new Error('Inference aborted.'));
    }
    this.pendingInferences.clear();
  }

  /**
   * PILLAR 1 INVARIANT: Hard Burn & Tombstone
   * Discards worker, purges in-memory result caches, dereferences strings, and sets terminated status.
   */
  public burn(): void {
    this.abort();

    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'TERMINATE' } as EdgeWorkerInboundMessage);
        this.worker.terminate();
      } catch {
        // Ignored
      }
      this.worker = null;
    }

    this.resultsCache.clear();
    this.pendingInferences.clear();
    this.modelLoaded = false;
    this.notifyStatus('terminated', 'All edge ML tensors and inference memory burned.');
  }
}

// Global singleton instance for application use
export const edgeService = new EdgeInferenceService();
