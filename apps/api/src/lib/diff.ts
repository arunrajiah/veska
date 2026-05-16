export type FieldDiff = {
  field: string;
  before: unknown;
  after: unknown;
};

// Compute a shallow diff between two objects
// Returns only the fields that changed
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FieldDiff[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: FieldDiff[] = [];
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diffs.push({ field: key, before: before[key], after: after[key] });
    }
  }
  return diffs;
}

// Redact sensitive fields from diff (don't log passwords, tokens, etc.)
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'totpSecret', 'backupCodes'];

export function redactDiff(diffs: FieldDiff[]): FieldDiff[] {
  return diffs
    .filter((d) => !SENSITIVE_FIELDS.some((s) => d.field.toLowerCase().includes(s.toLowerCase())))
    .map((d) => ({ ...d, before: d.before, after: d.after }));
}
