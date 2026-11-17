import type { Identity, Method, Role, RoleRecord } from '../data/types';
import { normalize } from './format';
export interface SearchEntry { identity: Identity; normalized: string; records: Partial<Record<Role,RoleRecord>> }
export function createSearchIndex(identities: Identity[], records: RoleRecord[]): SearchEntry[] {
  const byId = new Map<number,Partial<Record<Role,RoleRecord>>>();
  for(const record of records) { const roles=byId.get(record.playerId)??{}; roles[record.role]=record; byId.set(record.playerId,roles); }
  return identities.map(identity=>({identity,normalized:normalize(identity.name),records:byId.get(identity.playerId)??{}}));
}
export function bestRole(p: SearchEntry, method: Method): Role {
  const available = (['batter','bowler'] as const).filter(role=>p.records[role]?.methods[method].master !== null && p.records[role]!==undefined);
  return available.sort((a,b)=>(p.records[b]!.methods[method].percentile ?? -1)-(p.records[a]!.methods[method].percentile ?? -1))[0] ?? 'batter';
}
export function searchPlayers(index: SearchEntry[], query: string, method: Method, role?: Role): SearchEntry[] {
  const q = normalize(query); if(!q) return [];
  return index.map(p=>({p,relevance:p.normalized.split(' ').some(word=>word.startsWith(q)) ? 0 : p.normalized.includes(q) ? 1 : String(p.identity.playerId)===q ? 2 : 9}))
    .filter(({p,relevance})=>relevance<9 && (!role || (p.records[role]!==undefined && p.records[role]!.methods[method].master!==null)))
    .sort((a,b)=>a.relevance-b.relevance || (b.p.records[role ?? bestRole(b.p,method)]!.methods[method].master ?? -Infinity)-(a.p.records[role ?? bestRole(a.p,method)]!.methods[method].master ?? -Infinity) || a.p.identity.playerId-b.p.identity.playerId)
    .slice(0,8).map(({p})=>p);
}
