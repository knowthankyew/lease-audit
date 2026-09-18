/**
 * Text normalization for lease documents.
 * Cleans control characters, smart quotes, typographical dashes, and irregular whitespace.
 */
export function normalizeText(raw: string): string {
  if (!raw || !raw.trim()) {
    return '';
  }

  // Replace control chars (except \r, \n, \t)
  let cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Replace smart quotes and dashes
  cleaned = cleaned
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-');

  // Normalize newlines to \n
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Collapse 3+ newlines into 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim leading and trailing whitespace
  return cleaned.trim();
}
