/**
 * TypeScript Contracts for In-Browser Edge ML Inference (The FTaaS Bridge)
 */

export type ExecutionProvider = 'webgpu' | 'wasm' | 'simulated';

export type EdgeInferenceStatus =
  | 'uninitialized'
  | 'loading'
  | 'ready'
  | 'inferring'
  | 'error'
  | 'terminated';

export type SemanticRiskLevel = 'Low' | 'Moderate' | 'High';

export interface EdgeModelConfig {
  jobId?: string;
  modelName: string;
  baseModel: string;
  architecture: string;
  quantization: string;
  contextLength: number;
  zeroEgressInvariant: boolean;
  supportedExecutionProviders: ExecutionProvider[];
}

export interface SemanticAnalysisResult {
  clauseId: string;
  semanticRiskScore: number; // 0 - 100
  unconscionabilitySeverity: SemanticRiskLevel;
  keyRisks: string[];
  hiddenWaiversDetected: string[];
  statutoryCorroboration: string;
  aiCounterAmendment: string;
  tokensGenerated: number;
  tokensPerSec: number;
  latencyMs: number;
  executionProvider: ExecutionProvider;
}

export interface EdgeWorkerInitMessage {
  type: 'INIT';
  config?: Partial<EdgeModelConfig>;
  modelBuffer?: ArrayBuffer | Uint8Array;
  modelUrl?: string;
}

export interface EdgeWorkerLoadModelMessage {
  type: 'LOAD_MODEL';
  modelBuffer?: ArrayBuffer | Uint8Array;
  modelUrl?: string;
}

export interface EdgeWorkerInferMessage {
  type: 'ANALYZE_CLAUSE';
  clauseId: string;
  clauseText: string;
  jurisdiction: string;
  streamTokens?: boolean;
}

export interface EdgeWorkerAbortMessage {
  type: 'ABORT';
  clauseId?: string;
}

export interface EdgeWorkerTerminateMessage {
  type: 'TERMINATE';
}

export type EdgeWorkerInboundMessage =
  | EdgeWorkerInitMessage
  | EdgeWorkerLoadModelMessage
  | EdgeWorkerInferMessage
  | EdgeWorkerAbortMessage
  | EdgeWorkerTerminateMessage;

export interface EdgeWorkerStatusResponse {
  type: 'STATUS_CHANGED';
  status: EdgeInferenceStatus;
  executionProvider: ExecutionProvider;
  message?: string;
  modelLoaded?: boolean;
}

export interface EdgeWorkerTokenChunkResponse {
  type: 'TOKEN_CHUNK';
  clauseId: string;
  token: string;
  cumulativeText: string;
}

export interface EdgeWorkerCompleteResponse {
  type: 'INFERENCE_COMPLETE';
  clauseId: string;
  result: SemanticAnalysisResult;
}

export interface EdgeWorkerErrorResponse {
  type: 'ERROR';
  clauseId?: string;
  error: string;
}

export type EdgeWorkerOutboundMessage =
  | EdgeWorkerStatusResponse
  | EdgeWorkerTokenChunkResponse
  | EdgeWorkerCompleteResponse
  | EdgeWorkerErrorResponse;
