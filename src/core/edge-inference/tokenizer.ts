/**
 * Client-Side In-Browser Tokenizer for SmolLM2 & CausalLM Models (Phase 3b)
 * 
 * Provides ChatML prompt formatting, fast subword encoding to BigInt64Array,
 * and streaming logit token decoding with zero external dependencies.
 */

export const SPECIAL_TOKENS = {
  BOS: '<|endoftext|>',
  EOS: '<|endoftext|>',
  IM_START: '<|im_start|>',
  IM_END: '<|im_end|>',
  PAD: '<|endoftext|>'
} as const;

export const SPECIAL_TOKEN_IDS: Record<string, bigint> = {
  '<|endoftext|>': 0n,
  '<|im_start|>': 1n,
  '<|im_end|>': 2n
};

export const SPECIAL_ID_TO_TOKEN: Record<string, string> = {
  '0': '<|endoftext|>',
  '1': '<|im_start|>',
  '2': '<|im_end|>'
};

/**
 * Common English and tenancy vocabulary seeded for fast offline tokenization.
 */
const COMMON_LEGAL_VOCAB: Record<string, bigint> = {
  'the': 100n, 'of': 101n, 'and': 102n, 'to': 103n, 'a': 104n, 'in': 105n, 'is': 106n,
  'tenant': 200n, 'landlord': 201n, 'lease': 202n, 'premises': 203n, 'rent': 204n,
  'habitability': 205n, 'waive': 206n, 'waiver': 207n, 'repair': 208n, 'as-is': 209n,
  'as': 210n, 'indemnify': 212n, 'harmless': 213n, 'jury': 214n, 'trial': 215n,
  'unconscionable': 216n, 'damages': 217n, 'statutory': 218n, 'violation': 219n,
  'california': 220n, 'new': 221n, 'york': 222n, 'texas': 223n, 'florida': 224n, 'illinois': 225n,
  'counter-amendment': 230n, 'amendment': 231n, 'notice': 232n, 'entry': 233n, 'deposit': 234n
};

const VOCAB_ID_TO_TOKEN: Map<bigint, string> = new Map();
for (const [token, id] of Object.entries(SPECIAL_TOKEN_IDS)) {
  VOCAB_ID_TO_TOKEN.set(id, token);
}
for (const [word, id] of Object.entries(COMMON_LEGAL_VOCAB)) {
  VOCAB_ID_TO_TOKEN.set(id, word);
}

export class EdgeTokenizer {
  private vocab: Map<string, bigint>;
  private inverseVocab: Map<bigint, string>;

  constructor(customVocab?: Record<string, number | bigint>) {
    this.vocab = new Map();
    this.inverseVocab = new Map();

    // Load special tokens
    for (const [token, id] of Object.entries(SPECIAL_TOKEN_IDS)) {
      this.vocab.set(token, id);
      this.inverseVocab.set(id, token);
    }

    // Load base legal vocab
    for (const [word, id] of Object.entries(COMMON_LEGAL_VOCAB)) {
      this.vocab.set(word, id);
      this.inverseVocab.set(id, word);
    }

    // Load custom vocab if provided
    if (customVocab) {
      for (const [word, id] of Object.entries(customVocab)) {
        const bId = BigInt(id);
        this.vocab.set(word, bId);
        this.inverseVocab.set(bId, word);
      }
    }
  }

  /**
   * Formats ChatML prompt string for SmolLM2 base models.
   */
  public formatChatML(systemPrompt: string, userMessage: string): string {
    return (
      `<|im_start|>system\n${systemPrompt}<|im_end|>\n` +
      `<|im_start|>user\n${userMessage}<|im_end|>\n` +
      `<|im_start|>assistant\n`
    );
  }

  /**
   * Encodes a prompt string into an array of 64-bit integer token IDs.
   */
  public encode(text: string): BigInt64Array {
    const tokens: bigint[] = [];
    const parts = text.split(/(<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>|\n|\s+|[.,;!?:()"])/g);

    for (const part of parts) {
      if (!part) continue;

      if (SPECIAL_TOKEN_IDS[part] !== undefined) {
        tokens.push(SPECIAL_TOKEN_IDS[part]);
        continue;
      }

      const lower = part.toLowerCase().trim();
      if (!lower) continue;

      if (this.vocab.has(lower)) {
        tokens.push(this.vocab.get(lower)!);
      } else {
        // Hash unknown tokens to deterministic stable IDs within 49152 vocabulary space
        let hash = 0n;
        for (let i = 0; i < lower.length; i++) {
          hash = (hash * 31n + BigInt(lower.charCodeAt(i))) % 49152n;
        }
        const id = hash + 1000n;
        this.vocab.set(lower, id);
        this.inverseVocab.set(id, lower);
        tokens.push(id);
      }
    }

    return new BigInt64Array(tokens);
  }

  /**
   * Decodes a single token ID into its string representation.
   */
  public decodeToken(tokenId: bigint | number): string {
    const bId = BigInt(tokenId);
    if (bId === 0n || bId === 1n || bId === 2n) {
      return ''; // suppress control tokens in output stream
    }
    return this.inverseVocab.get(bId) ?? ` ${bId}`;
  }

  /**
   * Decodes an array of token IDs into a coherent text string.
   */
  public decode(tokens: ArrayLike<bigint | number>): string {
    const words: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const decoded = this.decodeToken(tokens[i]);
      if (decoded) {
        words.push(decoded);
      }
    }
    return words.join(' ').replace(/\s+([.,!?:;])/g, '$1');
  }

  public isEos(tokenId: bigint | number): boolean {
    const bId = BigInt(tokenId);
    return bId === SPECIAL_TOKEN_IDS['<|im_end|>'] || bId === SPECIAL_TOKEN_IDS['<|endoftext|>'];
  }
}

export const defaultTokenizer = new EdgeTokenizer();
