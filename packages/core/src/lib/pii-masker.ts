// ──────────────────────────────────────────────────────────────
// PII Masker — redact sensitive data before AI calls
// ──────────────────────────────────────────────────────────────

export interface MaskResult {
  masked: string;
  mappings: Record<string, string>; // placeholder → original value
}

// Counters reset per maskPII call (closed over in each invocation)
type PatternDef = {
  type: string;
  regex: RegExp;
};

const PATTERNS: PatternDef[] = [
  // Email addresses (before phone so we don't mis-match)
  {
    type: 'EMAIL',
    regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
  },
  // Phone numbers — international and domestic formats
  {
    type: 'PHONE',
    regex:
      /(?<!\d)(\+?1[\s\-.]?)?\(?[2-9]\d{2}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}(?!\d)/g,
  },
  // UK NIN: AB123456C
  {
    type: 'SSN',
    regex: /\b[A-Z]{2}\d{6}[A-D]\b/g,
  },
  // US SSN: 123-45-6789
  {
    type: 'SSN',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  // Passport numbers (A12345678 style)
  {
    type: 'PASSPORT',
    regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
  },
  // Credit card: 16 digits with optional spaces/dashes
  {
    type: 'CC',
    regex: /\b(?:\d{4}[\s\-]){3}\d{4}\b/g,
  },
  // Bank account: 8–10 consecutive digits not preceded/followed by digit
  {
    type: 'BANK',
    regex: /(?<!\d)\d{8,10}(?!\d)/g,
  },
  // Salary / pay amount patterns (labelled)
  {
    type: 'SALARY',
    regex:
      /\b(?:salary|pay|wage|compensation|ctc|annual\s+package)[\s:]*\$?[\d,]+(?:\.\d{1,2})?\b/gi,
  },
];

export function maskPII(text: string): MaskResult {
  const mappings: Record<string, string> = {};
  const counters: Record<string, number> = {};

  let masked = text;

  for (const { type, regex } of PATTERNS) {
    // Reset lastIndex for global regexes
    regex.lastIndex = 0;

    masked = masked.replace(regex, (match) => {
      // Look for an existing placeholder that maps to this exact original value
      const existing = Object.entries(mappings).find(([, v]) => v === match);
      if (existing) return existing[0];

      counters[type] = (counters[type] ?? 0) + 1;
      const placeholder = `[REDACTED_${type}_${counters[type]}]`;
      mappings[placeholder] = match;
      return placeholder;
    });
  }

  return { masked, mappings };
}

export function unmaskPII(
  text: string,
  mappings: Record<string, string>,
): string {
  let result = text;
  for (const [placeholder, original] of Object.entries(mappings)) {
    // Escape special regex chars in placeholder (square brackets)
    const escaped = placeholder.replace(/[[\]]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), original);
  }
  return result;
}
