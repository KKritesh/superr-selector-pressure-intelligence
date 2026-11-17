export interface Report {
  generatedAt: string;
  status: 'passed' | 'failed';
  criticalErrors: string[];
  warnings: string[];
  checks: Record<string, { checked: number; mismatches: number }>;
  unresolvedNames: number[];
  collisions: { name: string; playerIds: number[] }[];
  unmatchedRows: string[];
  facts: Record<string, unknown>;
  headers: Record<string, string[]>;
}
export function report(): Report {
  return {
    generatedAt: new Date().toISOString(),
    status: 'passed',
    criticalErrors: [],
    warnings: [],
    checks: {},
    unresolvedNames: [],
    collisions: [],
    unmatchedRows: [],
    facts: {},
    headers: {},
  };
}
export function check(r: Report, name: string, valid: boolean): void {
  const c = (r.checks[name] ??= { checked: 0, mismatches: 0 });
  c.checked++;
  if (!valid) c.mismatches++;
}
export const close = (a: number | null, b: number | null, tolerance = 1e-6): boolean =>
  a === null || b === null ? a === b : Math.abs(a - b) <= tolerance;
