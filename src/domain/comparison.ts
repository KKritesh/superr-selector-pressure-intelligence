import type { Role, Method, RoleRecord } from '../data/types';
import { MAX_COMPARE } from '../config/constants';
export function normalizeComparison(
  ids: string | null,
  role: Role,
  method: Method,
  records: Map<string, RoleRecord>,
): number[] {
  const parsed = (ids ?? '')
    .split(',')
    .filter((s) => /^\d+$/.test(s))
    .map(Number);
  return [...new Set(parsed)]
    .filter((id) => {
      const r = records.get(`${role}:${id}`);
      return r !== undefined && r.methods[method].master !== null;
    })
    .slice(0, MAX_COMPARE);
}
