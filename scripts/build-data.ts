import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { book, sheet, locate, num, id, iso, text, type Row } from './lib/excel';
import { markCollisions } from './lib/names';
import { addRanks, weightedMean } from './lib/derive';
import { report, check, close, type Report } from './lib/validate';
import { HALF_LIFE_DAYS, LIMITED_SAMPLE_MATCHES } from '../src/config/constants';
import type { Identity, RoleRecord, Meta, Role, History, MethodScore } from '../src/data/types';

const bColumns = 'role player_id player_name player_nationality played_in_last_2_years matches_played first_match_date last_match_date recency_weighted_average sum_recency_weights effective_sample_size role_benchmark_mu shrinkage_k bayesian_adjusted_score master_pressure_score role_rank'.split(' ');
const cColumns = 'role player_id matches_played first_match_date last_match_date recency_weighted_average sum_recency_weights effective_sample_size role_benchmark_mu shrinkage_k bayesian_adjusted_score weighted_standard_deviation consistency_lambda consistency_penalty master_pressure_score role_rank rank_difference_vs_B'.split(' ');
const aColumns = 'role player_id match_id match_date match_age_days Final_Pressure_Score recency_weight'.split(' ');
const mwColumns = 'match_id player_id Adjusted_Realtime_Score_R Individual_Player_Score_I Final_Pressure_Score'.split(' ');
const mapColumns = 'player_id player_name player_country played_in_last_2_years'.split(' ');
const roles: Role[] = ['batter', 'bowler'];
const roleOf = (r: Row): Role => {
  if (r.role !== 'Batter' && r.role !== 'Bowler') throw new Error(`Excel row ${r.__row}: unknown role ${String(r.role)}`);
  return String(r.role).toLowerCase() as Role;
};
const keyOf = (r: Row): string => `${roleOf(r)}:${id(r.player_id, 'player_id')}`;
const numeric = (r: Row, column: string): number | null => num(r[column], `${column}, Excel row ${r.__row}`);
function unique(rows: Row[], key: (r: Row) => string, context: string): Map<string, Row> {
  const map = new Map<string, Row>();
  for (const r of rows) { const k = key(r); if (map.has(k)) throw new Error(`${context}: duplicate key ${k} at Excel row ${r.__row}`); map.set(k, r); }
  return map;
}
function methodScore(r: Row): MethodScore {
  return { master: numeric(r, 'master_pressure_score'), rank: numeric(r, 'role_rank'), rankDisplay: '', isTied: false, percentile: null };
}
function atomicEmit(output: string, files: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const stage = fs.mkdtempSync(path.join(path.dirname(output), '.data-'));
  const backup = `${stage}-previous`;
  try {
    for (const [file, value] of Object.entries(files)) fs.writeFileSync(path.join(stage, file), JSON.stringify(value));
    if (fs.existsSync(output)) fs.renameSync(output, backup);
    try { fs.renameSync(stage, output); } catch (error) { if (fs.existsSync(backup)) fs.renameSync(backup, output); throw error; }
    fs.rmSync(backup, { recursive: true, force: true });
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}
export function buildData(sourceDir: string, output: string): Report {
  const validation = report();
  const consumed = new Set<string>();
  const source = (pattern: RegExp, required = true) => { const file = locate(sourceDir, pattern, required); if (file) consumed.add(file); return file; };
  const masterFile = source(/^Playerwise_Master_Pressure_Scores(?:\s*\(\d+\))?\.xlsx$/i)!;
  const matchFile = source(/^Matchwise_Pressure_Corrected(?:\s*\(\d+\))?\.xlsx$/i)!;
  const master = book(masterFile);
  const read = (wb: ReturnType<typeof book>, file: string, name: string, required: string[]) => {
    const rows = sheet(wb, file, name, required);
    validation.headers[`${path.basename(file)} › ${name}`] = Object.keys(rows[0] ?? {}).filter(k => k !== '__row');
    return rows;
  };
  const bs = read(master, masterFile, 'Option_B_Bayesian', bColumns);
  const cs = read(master, masterFile, 'Option_C_Consistency', cColumns);
  const audit = read(master, masterFile, 'Match_Weights_Audit', aColumns);
  const mapping = read(master, masterFile, 'Player_Mapping', mapColumns);
  const bIndex = unique(bs, keyOf, 'Option B');
  const cIndex = unique(cs, keyOf, 'Option C');
  if (bIndex.size !== cIndex.size || [...bIndex.keys()].some(k => !cIndex.has(k))) throw new Error('Option B/C (role, player_id) key sets differ');
  unique(audit, r => `${keyOf(r)}:${id(r.match_id,'match_id')}`, 'Match_Weights_Audit');
  const embedded = unique(mapping, r => String(id(r.player_id,'mapping player_id')), 'Player_Mapping');
  let external = new Map<string, Row>();
  const externalFile = source(/^Player_ID_Mapping(?:\s*\(\d+\))?\.xlsx$/i, false);
  if (externalFile) {
    external = unique(read(book(externalFile), externalFile, 'Player_Mapping', mapColumns), r => String(id(r.player_id,'mapping player_id')), 'External Player_Mapping');
    const mappingDifferences = [...new Set([...embedded.keys(), ...external.keys()])].filter(k => {
      const a = embedded.get(k), b = external.get(k);
      return !a || !b || mapColumns.some(c => text(a[c]) !== text(b[c]));
    });
    validation.facts.mappingDifferences = mappingDifferences;
    if (mappingDifferences.length) validation.warnings.push(`${mappingDifferences.length} IDs differ between embedded and external mapping; embedded mapping is preferred.`);
  } else {
    validation.warnings.push(`Player_ID_Mapping.xlsx was not supplied. Using the validated embedded Player_Mapping (${mapping.length} rows); external-copy equivalence cannot be checked.`);
  }
  const fallback = new Map<string, Row>();
  const fallbackFile = source(/^competition_team_player_mapping(?:\s*\(\d+\))?\.xlsx$/i, false);
  if (fallbackFile) for (const row of read(book(fallbackFile), fallbackFile, 'competition_team_player_mapping', ['player_id','player_name'])) {
    const k = String(id(row.player_id,'fallback player_id')); if (!fallback.has(k) && text(row.player_name)) fallback.set(k,row);
  }
  const matchesFile = source(/^matches(?:\s*\(\d+\))?\.xlsx$/i, false);
  const matches = matchesFile ? unique(read(book(matchesFile), matchesFile, 'matches', ['match_id','home_team_id','away_team_id','home_team','away_team']), r => String(id(r.match_id,'match_id')), 'matches') : new Map<string,Row>();
  const compsFile = source(/^competitions(?:\s*\(\d+\))?\.xlsx$/i, false);
  if (compsFile) {
    const comps = read(book(compsFile), compsFile, 'competitions', ['match_format']);
    validation.facts.competitionFormats = Object.fromEntries([...new Set(comps.map(r => String(r.match_format)))].map(format => [format, comps.filter(r => r.match_format === format).length]));
  }
  const matchBook = book(matchFile, ['Batter_Matchwise_Pressure','Bowler_Matchwise_Pressure']);
  const mw: Record<Role, Map<string, Row>> = {
    batter: unique(read(matchBook,matchFile,'Batter_Matchwise_Pressure',mwColumns), r => `${id(r.match_id,'match_id')}:${id(r.player_id,'player_id')}`, 'Batter match-wise'),
    bowler: unique(read(matchBook,matchFile,'Bowler_Matchwise_Pressure',mwColumns), r => `${id(r.match_id,'match_id')}:${id(r.player_id,'player_id')}`, 'Bowler match-wise'),
  };
  for (const role of roles) for (const row of mw[role].values()) for (const field of ['Adjusted_Realtime_Score_R','Individual_Player_Score_I','Final_Pressure_Score']) {
    const value = numeric(row, field); check(validation, `${role}: match-wise values present`, value !== null);
  }
  const identityMap = new Map<number,Identity>();
  const records: RoleRecord[] = [];
  const hist: Record<Role, History> = { batter: {}, bowler: {} };
  const auditByPlayer = new Map<string, { row: Row; weight: number; realtime: number | null; individual: number | null }[]>();
  const asOf = new Set<string>();
  for (const row of audit) {
    const role = roleOf(row), playerId = id(row.player_id,'player_id'), matchId = id(row.match_id,'match_id'), key = keyOf(row);
    if (!bIndex.has(key)) throw new Error(`Audit row ${row.__row}: ${key} absent from master`);
    const weight = numeric(row,'recency_weight');
    const final = numeric(row,'Final_Pressure_Score');
    if (weight === null || weight < 0 || final === null) throw new Error(`Audit row ${row.__row}: missing/invalid weight or score`);
    const matched = mw[role].get(`${matchId}:${playerId}`);
    if (!matched) validation.unmatchedRows.push(`${role}:${playerId}:${matchId}`);
    const realtime = matched ? numeric(matched,'Adjusted_Realtime_Score_R') : null;
    const individual = matched ? numeric(matched,'Individual_Player_Score_I') : null;
    const date = iso(row.match_date), age = numeric(row,'match_age_days');
    check(validation, `${role}: audit final vs match-wise`, matched !== undefined && close(final,numeric(matched,'Final_Pressure_Score')));
    check(validation, 'recency half-life', age !== null && close(weight, 0.5 ** (age / HALF_LIFE_DAYS)));
    if (date && age !== null) asOf.add(new Date(Date.parse(date) + age * 86400000).toISOString().slice(0,10));
    const context = matches.get(String(matchId));
    const team = matched?.team_id;
    const label = context && team !== null && team !== undefined ? team === context.home_team_id ? text(context.away_team) : team === context.away_team_id ? text(context.home_team) : null : null;
    (hist[role][playerId] ??= []).push({ matchId, date, final, realtime, individual, ...(label ? { label } : {}) });
    const items = auditByPlayer.get(key) ?? []; items.push({row,weight,realtime,individual}); auditByPlayer.set(key,items);
  }
  if (asOf.size !== 1) throw new Error(`Audit dates imply inconsistent as-of dates: ${[...asOf].join(', ')}`);
  const activeValues = new Set<string>();
  let rankBCSign = true, rankCBSign = true, changedRanks = 0;
  for (const b of bs) {
    const key = keyOf(b), c = cIndex.get(key)!, role = roleOf(b), playerId = id(b.player_id,'player_id');
    const fallbackRows = [b,embedded.get(String(playerId)),external.get(String(playerId)),fallback.get(String(playerId))];
    const nameIndex = fallbackRows.findIndex(r => r && text(r.player_name));
    const name = nameIndex < 0 ? `Player #${playerId}` : text(fallbackRows[nameIndex]!.player_name)!;
    const nameSource = ['Option_B_Bayesian','embedded.Player_Mapping','external.Player_Mapping','competition_team_player_mapping'][nameIndex] ?? 'id_fallback';
    if (nameIndex < 0) validation.unresolvedNames.push(playerId);
    const nationality = text(b.player_nationality) ?? text(embedded.get(String(playerId))?.player_country) ?? text(external.get(String(playerId))?.player_country);
    const rawActive = text(b.played_in_last_2_years) ?? text(embedded.get(String(playerId))?.played_in_last_2_years) ?? text(external.get(String(playerId))?.played_in_last_2_years);
    if (rawActive) activeValues.add(rawActive);
    if (!identityMap.has(playerId)) identityMap.set(playerId,{playerId,name,nameSource,nationality,activeLast2Years:rawActive === 'Yes' ? true : rawActive === 'No' ? false : null,hasNameCollision:false,roles:[]});
    identityMap.get(playerId)!.roles.push(role);
    const sb = methodScore(b), sc = methodScore(c);
    const diff = sb.rank === null || sc.rank === null ? null : sb.rank - sc.rank;
    sc.consistencyPenalty = numeric(c,'consistency_penalty'); sc.weightedSd = numeric(c,'weighted_standard_deviation'); sc.rankDiffVsB = diff;
    const sourceDiff = numeric(c,'rank_difference_vs_B');
    rankBCSign &&= close(diff,sourceDiff); rankCBSign &&= diff === null ? sourceDiff === null : close(-diff,sourceDiff);
    if (diff !== 0 && diff !== null) changedRanks++;
    const items = auditByPlayer.get(key) ?? [], weights = items.map(v => v.weight);
    const sum = weights.reduce((a,v)=>a+v,0), squareSum = weights.reduce((a,v)=>a+v*v,0);
    const realtime = weightedMean(items.map(v=>({weight:v.weight,value:v.realtime})));
    const individual = weightedMean(items.map(v=>({weight:v.weight,value:v.individual})));
    const matchesPlayed = numeric(b,'matches_played');
    const ess = numeric(b,'effective_sample_size');
    check(validation,'history count vs matches',items.length === matchesPlayed);
    check(validation,'sum of supplied weights',close(sum,numeric(b,'sum_recency_weights')));
    check(validation,'effective sample reconciliation',close(squareSum > 0 ? sum*sum/squareSum : null,ess));
    check(validation,'Option B identity',close(sb.master,numeric(b,'bayesian_adjusted_score')));
    check(validation,'Option C identity',close(sc.master, numeric(c,'bayesian_adjusted_score') === null || sc.consistencyPenalty === null ? null : numeric(c,'bayesian_adjusted_score')! - sc.consistencyPenalty!));
    for (const column of ['matches_played','first_match_date','last_match_date','effective_sample_size','recency_weighted_average','role_benchmark_mu','sum_recency_weights']) {
      check(validation,`B/C shared ${column}`, column.includes('date') ? iso(b[column]) === iso(c[column]) : close(numeric(b,column),numeric(c,column)));
    }
    records.push({playerId,role,matches:matchesPlayed,firstMatchDate:iso(b.first_match_date),lastMatchDate:iso(b.last_match_date),effectiveSampleSize:ess,recencyWeightedAvg:numeric(b,'recency_weighted_average'),benchmark:numeric(b,'role_benchmark_mu'),methods:{B:sb,C:sc},supporting:{realtimeAvg:realtime.average,individualAvg:individual.average,realtimeN:realtime.count,individualN:individual.count},source:{workbook:path.basename(masterFile),sheetB:'Option_B_Bayesian',rowB:b.__row,sheetC:'Option_C_Consistency',rowC:c.__row}});
  }
  for (const role of roles) {
    for (const observations of Object.values(hist[role])) observations.sort((a,b)=>(a.date ?? '9999').localeCompare(b.date ?? '9999') || a.matchId-b.matchId);
    for (const m of ['B','C'] as const) {
      const rr = records.filter(r=>r.role===role).map(r=>r.methods[m]); addRanks(rr);
      const sorted = [...rr].filter(s=>s.master!==null && s.rank!==null).sort((a,b)=>a.rank!-b.rank!);
      for (let i=1;i<sorted.length;i++) check(validation,`${role} ${m}: rank order`,sorted[i-1].master! >= sorted[i].master! - 1e-9);
      check(validation,`${role} ${m}: unique ranks`,new Set(sorted.map(s=>s.rank)).size === sorted.length);
    }
  }
  const identities = [...identityMap.values()];
  validation.collisions = markCollisions(identities);
  validation.facts = {...validation.facts, embeddedMappingRows:mapping.length, rankDifferenceSourceConvention:rankCBSign ? 'rank C minus rank B' : rankBCSign ? 'rank B minus rank C' : 'mixed; see warnings',displayRankDifferenceConvention:'rank B minus rank C; positive means improved under C', changedRanks, activeValues:[...activeValues],matchedMatchwiseFile:path.basename(matchFile),asOfDate:[...asOf][0]};
  if (!rankBCSign && !rankCBSign) validation.warnings.push('rank_difference_vs_B does not consistently match either sign convention. Display uses rank B minus rank C.');
  for (const [name, result] of Object.entries(validation.checks)) if (result.mismatches) validation.warnings.push(`${name}: ${result.mismatches}/${result.checked} mismatches; source values preserved.`);
  if (validation.unmatchedRows.length) validation.warnings.push(`${validation.unmatchedRows.length} audit rows have no match-wise join; supporting averages exclude missing metrics.`);
  const undated = audit.filter(r=>!iso(r.match_date)).length;
  if (undated) validation.warnings.push(`${undated} audit observations have no date; excluded from charts.`);
  const allDates = audit.map(r=>iso(r.match_date)).filter((s):s is string=>s!==null).sort();
  const ks = [...new Set(bs.map(r=>numeric(r,'shrinkage_k')))];
  const lambdas = [...new Set(cs.map(r=>numeric(r,'consistency_lambda')))];
  if (ks.length !== 1 || ks[0] === null || lambdas.length !== 1 || lambdas[0] === null) throw new Error('Non-uniform or missing shrinkage/consistency parameters');
  const population = {batter:records.filter(r=>r.role==='batter').length,bowler:records.filter(r=>r.role==='bowler').length};
  const meta: Meta = {generatedAt:validation.generatedAt,dataThrough:allDates.at(-1) ?? '',asOfDate:[...asOf][0],params:{halfLifeDays:HALF_LIFE_DAYS,shrinkageK:ks[0]!,consistencyLambda:lambdas[0]!},roleBenchmark:{batter:records.find(r=>r.role==='batter')?.benchmark ?? null,bowler:records.find(r=>r.role==='bowler')?.benchmark ?? null},population:{B:{...population},C:{...population}},sources:[...consumed].map(file=>({file:path.basename(file),sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')})),counts:{identities:identities.length,roleRecords:records.length,dualRole:identities.filter(p=>p.roles.length===2).length,auditRows:audit.length,limitedSample:records.filter(r=>r.matches!==null && r.matches<LIMITED_SAMPLE_MATCHES).length}};
  validation.facts.counts = {...meta.counts,...population};
  atomicEmit(output,{'meta.json':meta,'players.json':{identities,records},'history.batter.json':hist.batter,'history.bowler.json':hist.bowler,'validation-report.json':validation});
  console.log(`Data build passed: ${population.batter} batters, ${population.bowler} bowlers, ${meta.counts.dualRole} dual-role players; ${audit.length} observations.`);
  console.log(`Data through ${meta.dataThrough}; weights as of ${meta.asOfDate}. ${Object.keys(validation.checks).length} reconciliation checks.`);
  for (const warning of validation.warnings) console.warn(`Warning: ${warning}`);
  return validation;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2), sourceDir = path.resolve(args[args.indexOf('--source')+1] && args.includes('--source') ? args[args.indexOf('--source')+1] : 'data/source');
  const output = path.resolve(args[args.indexOf('--out')+1] && args.includes('--out') ? args[args.indexOf('--out')+1] : 'public/data');
  try { buildData(sourceDir,output); } catch (error) { console.error(`Data build failed; existing JSON was left untouched.\n${error instanceof Error ? error.message : String(error)}`); process.exitCode=1; }
}
