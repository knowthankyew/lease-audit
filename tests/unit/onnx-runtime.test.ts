import { describe, it, expect, beforeEach } from 'vitest';
import * as ort from 'onnxruntime-web';
import { EdgeInferenceService } from '../../src/core/edge-inference/edge-service';

describe('ONNX Runtime Web Integration (Phase 3b)', () => {
  let service: EdgeInferenceService;

  beforeEach(() => {
    service = new EdgeInferenceService();
  });

  it('verifies onnxruntime-web package exports InferenceSession and Tensor', () => {
    expect(ort).toBeDefined();
    expect(ort.InferenceSession).toBeDefined();
    expect(ort.Tensor).toBeDefined();
  });

  it('constructs 64-bit input_ids Tensor conforming to CausalLM graph specifications', () => {
    const inputIds = new BigInt64Array([1n, 200n, 205n, 2n]);
    const tensor = new ort.Tensor('int64', inputIds, [1, 4]);

    expect(tensor.type).toBe('int64');
    expect(tensor.dims).toEqual([1, 4]);
    expect(tensor.data.length).toBe(4);
  });

  it('manages model loading lifecycle and state transitions', async () => {
    expect(service.isModelLoaded()).toBe(false);

    // Mock lightweight buffer representing exported ONNX weights
    const dummyWeights = new Uint8Array([0x08, 0x01, 0x12, 0x04, 0x6d, 0x6f, 0x63, 0x6b]);
    await service.loadModel(dummyWeights.buffer);

    expect(service.isModelLoaded()).toBe(true);

    const result = await service.analyzeClause(
      'onnx-clause-1',
      'Tenant takes premises AS-IS with all faults.',
      'CA'
    );

    expect(result.clauseId).toBe('onnx-clause-1');
    expect(result.unconscionabilitySeverity).toBe('High');
    expect(result.hiddenWaiversDetected).toContain('Statutory Warranty of Habitability Waiver');
  });

  it('Pillar 1 Invariant: burn() unloads model weights and resets isModelLoaded to false', async () => {
    const dummyWeights = new Uint8Array([1, 2, 3, 4]);
    await service.loadModel(dummyWeights.buffer);
    expect(service.isModelLoaded()).toBe(true);

    service.burn();

    expect(service.isModelLoaded()).toBe(false);
    expect(service.getStatus()).toBe('terminated');
  });
});
