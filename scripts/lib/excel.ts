import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
export type Row = Record<string, unknown> & { __row: number };
export function locate(dir: string, pattern: RegExp, required = true): string | null {
  const names = fs.readdirSync(dir).filter((n) => !n.startsWith('~$') && pattern.test(n));
  if (names.length > 1)
    throw new Error(`Ambiguous source ${pattern}: ${names.join(', ')}. Keep one version.`);
  if (!names.length && required)
    throw new Error(`Missing source ${pattern}. Found: ${fs.readdirSync(dir).join(', ')}`);
  return names[0] ? path.join(dir, names[0]) : null;
}
export function book(file: string, sheets?: string[]): XLSX.WorkBook {
  return XLSX.readFile(file, { cellDates: true, sheets });
}
export function sheet(wb: XLSX.WorkBook, file: string, name: string, required: string[]): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`${path.basename(file)} › missing worksheet ${name}`);
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    blankrows: true,
  });
  const header = (data[0] ?? []).map((v) => String(v ?? '').trim());
  const missing = required.filter((k) => !header.includes(k));
  if (missing.length)
    throw new Error(`${path.basename(file)} › ${name} › missing column(s): ${missing.join(', ')}`);
  return data.slice(1).flatMap((values, index) =>
    values.every((v) => v === null)
      ? []
      : [
          Object.assign(Object.fromEntries(header.map((k, i) => [k, values[i] ?? null])), {
            __row: index + 2,
          }) as Row,
        ],
  );
}
export function num(value: unknown, context: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`${context}: expected finite number, got ${String(value)}`);
  return value;
}
export function id(value: unknown, context: string): number {
  const n = num(value, context);
  if (n === null || !Number.isInteger(n)) throw new Error(`${context}: missing/invalid integer ID`);
  return n;
}
export function iso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date)
    return Number.isFinite(+value) ? value.toISOString().slice(0, 10) : null;
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null;
  }
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}
export const text = (value: unknown): string | null =>
  value === null || value === undefined || String(value).trim() === ''
    ? null
    : String(value).trim().replace(/\s+/g, ' ');
