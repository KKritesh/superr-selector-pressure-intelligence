export type Role = 'batter' | 'bowler';
export type Method = 'B' | 'C';
export interface Meta {
  generatedAt: string; dataThrough: string; asOfDate: string;
  params: { halfLifeDays: number; shrinkageK: number; consistencyLambda: number };
  roleBenchmark: Record<Role, number | null>;
  population: Record<Method, Record<Role, number>>;
  sources: { file: string; sha256: string }[];
  counts: { identities: number; roleRecords: number; dualRole: number; auditRows: number; limitedSample: number };
}
export interface Identity {
  playerId: number; name: string; nameSource: string; nationality: string | null;
  activeLast2Years: boolean | null; hasNameCollision: boolean; roles: Role[];
}
export interface MethodScore {
  master: number | null; rank: number | null; rankDisplay: string; isTied: boolean;
  percentile: number | null; consistencyPenalty?: number | null; weightedSd?: number | null; rankDiffVsB?: number | null;
}
export interface RoleRecord {
  playerId: number; role: Role; matches: number | null;
  firstMatchDate: string | null; lastMatchDate: string | null; effectiveSampleSize: number | null;
  recencyWeightedAvg: number | null; benchmark: number | null;
  methods: Record<Method, MethodScore>;
  supporting: { realtimeAvg: number | null; individualAvg: number | null; realtimeN: number; individualN: number };
  source: { workbook: string; sheetB: string; rowB: number; sheetC: string; rowC: number };
}
export interface Observation {
  matchId: number; date: string | null; final: number;
  realtime: number | null; individual: number | null; label?: string;
}
export type History = Record<string, Observation[]>;
export interface Players { identities: Identity[]; records: RoleRecord[] }
export interface RankedPlayer { identity: Identity; record: RoleRecord }
