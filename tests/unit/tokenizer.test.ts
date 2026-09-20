import { describe, it, expect } from 'vitest';
import { EdgeTokenizer, SPECIAL_TOKEN_IDS } from '../../src/core/edge-inference/tokenizer';

describe('EdgeTokenizer (Phase 3b)', () => {
  const tokenizer = new EdgeTokenizer();

  it('formats ChatML prompts conforming to SmolLM2 specifications', () => {
    const prompt = tokenizer.formatChatML(
      'You are a legal assistant.',
      'Analyze this clause: "Tenant accepts premises AS-IS".'
    );

    expect(prompt).toContain('<|im_start|>system\nYou are a legal assistant.<|im_end|>');
    expect(prompt).toContain('<|im_start|>user\nAnalyze this clause: "Tenant accepts premises AS-IS".<|im_end|>');
    expect(prompt.endsWith('<|im_start|>assistant\n')).toBe(true);
  });

  it('encodes special tokens into predefined 64-bit IDs', () => {
    const tokens = tokenizer.encode('<|im_start|> <|im_end|> <|endoftext|>');
    expect(tokens).toBeInstanceOf(BigInt64Array);
    expect(Array.from(tokens)).toEqual([
      SPECIAL_TOKEN_IDS['<|im_start|>'],
      SPECIAL_TOKEN_IDS['<|im_end|>'],
      SPECIAL_TOKEN_IDS['<|endoftext|>']
    ]);
  });

  it('encodes and decodes English legal tenancy vocabulary', () => {
    const text = 'tenant waives habitability and jury trial';
    const tokens = tokenizer.encode(text);

    expect(tokens.length).toBeGreaterThanOrEqual(4);
    const decoded = tokenizer.decode(tokens);
    expect(decoded.toLowerCase()).toContain('tenant');
    expect(decoded.toLowerCase()).toContain('habitability');
    expect(decoded.toLowerCase()).toContain('jury');
    expect(decoded.toLowerCase()).toContain('trial');
  });

  it('correctly identifies End-Of-Sequence (EOS) tokens', () => {
    expect(tokenizer.isEos(SPECIAL_TOKEN_IDS['<|im_end|>'])).toBe(true);
    expect(tokenizer.isEos(SPECIAL_TOKEN_IDS['<|endoftext|>'])).toBe(true);
    expect(tokenizer.isEos(100n)).toBe(false);
  });

  it('decodes single streaming tokens without control artifacts', () => {
    expect(tokenizer.decodeToken(SPECIAL_TOKEN_IDS['<|im_start|>'])).toBe('');
    expect(tokenizer.decodeToken(SPECIAL_TOKEN_IDS['<|im_end|>'])).toBe('');
    expect(tokenizer.decodeToken(200n)).toBe('tenant');
  });
});
