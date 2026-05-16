import { describe, it, expect } from 'vitest';
import { maskPII, unmaskPII } from '../pii-masker.js';

describe('maskPII', () => {
  it('masks email addresses', () => {
    const { masked, mappings } = maskPII('Contact us at hello@example.com or support@veska.io');
    expect(masked).not.toContain('hello@example.com');
    expect(masked).not.toContain('support@veska.io');
    expect(masked).toContain('[REDACTED_EMAIL_1]');
    expect(masked).toContain('[REDACTED_EMAIL_2]');
    expect(Object.values(mappings)).toContain('hello@example.com');
    expect(Object.values(mappings)).toContain('support@veska.io');
  });

  it('masks US phone numbers', () => {
    const { masked, mappings } = maskPII('Call me at (415) 555-0100 or 415-555-0101');
    expect(masked).not.toContain('(415) 555-0100');
    expect(masked).toContain('[REDACTED_PHONE_1]');
    expect(Object.values(mappings)).toContain('(415) 555-0100');
  });

  it('masks US SSNs', () => {
    const { masked, mappings } = maskPII('SSN: 123-45-6789');
    expect(masked).not.toContain('123-45-6789');
    expect(masked).toContain('[REDACTED_SSN_1]');
    expect(Object.values(mappings)).toContain('123-45-6789');
  });

  it('masks UK National Insurance Numbers', () => {
    const { masked, mappings } = maskPII('NIN: AB123456C');
    expect(masked).not.toContain('AB123456C');
    expect(masked).toContain('[REDACTED_SSN_1]');
    expect(Object.values(mappings)).toContain('AB123456C');
  });

  it('masks credit card numbers with spaces', () => {
    const { masked, mappings } = maskPII('Card: 4111 1111 1111 1111');
    expect(masked).not.toContain('4111 1111 1111 1111');
    expect(masked).toContain('[REDACTED_CC_1]');
    expect(Object.values(mappings)).toContain('4111 1111 1111 1111');
  });

  it('masks credit card numbers with dashes', () => {
    const { masked, mappings } = maskPII('CC: 4111-1111-1111-1111');
    expect(masked).not.toContain('4111-1111-1111-1111');
    expect(masked).toContain('[REDACTED_CC_1]');
    expect(Object.values(mappings)).toContain('4111-1111-1111-1111');
  });

  it('masks bank account numbers (8–10 digits)', () => {
    const { masked, mappings } = maskPII('Bank account: 12345678');
    expect(masked).not.toContain('12345678');
    expect(masked).toContain('[REDACTED_BANK_1]');
    expect(Object.values(mappings)).toContain('12345678');
  });

  it('masks labelled salary patterns', () => {
    const { masked, mappings } = maskPII('salary: $85,000');
    expect(masked).not.toContain('85,000');
    expect(masked).toContain('[REDACTED_SALARY_1]');
    expect(Object.values(mappings)).toContain('salary: $85,000');
  });

  it('masks labelled pay patterns (case-insensitive)', () => {
    const { masked } = maskPII('Pay: 95000');
    expect(masked).toContain('[REDACTED_SALARY_1]');
  });

  it('reuses the same placeholder for repeated identical values', () => {
    const { masked } = maskPII('email: test@example.com and again test@example.com');
    // Should appear twice with same placeholder
    const count = (masked.match(/\[REDACTED_EMAIL_1\]/g) ?? []).length;
    expect(count).toBe(2);
  });

  it('returns empty mappings for text with no PII', () => {
    const { masked, mappings } = maskPII('Hello, how are you?');
    expect(masked).toBe('Hello, how are you?');
    expect(Object.keys(mappings)).toHaveLength(0);
  });
});

describe('unmaskPII', () => {
  it('restores original values from placeholders', () => {
    const original = 'Contact hello@example.com for help';
    const { masked, mappings } = maskPII(original);
    const restored = unmaskPII(masked, mappings);
    expect(restored).toBe(original);
  });

  it('restores multiple different PII types', () => {
    const original = 'email: test@example.com, ssn: 123-45-6789, salary: $85,000';
    const { masked, mappings } = maskPII(original);
    const restored = unmaskPII(masked, mappings);
    expect(restored).toBe(original);
  });

  it('handles AI responses that include placeholder text', () => {
    const mappings: Record<string, string> = {
      '[REDACTED_EMAIL_1]': 'alice@company.com',
    };
    const aiResponse = 'I will contact [REDACTED_EMAIL_1] on your behalf.';
    const restored = unmaskPII(aiResponse, mappings);
    expect(restored).toBe('I will contact alice@company.com on your behalf.');
  });

  it('is a no-op when mappings are empty', () => {
    const text = 'No PII here';
    expect(unmaskPII(text, {})).toBe(text);
  });
});
