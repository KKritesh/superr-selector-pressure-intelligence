import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { book, sheet, locate, iso, num, type Row } from './lib/excel';
import type { Players, Meta, History, Role, RoleRecord } from '../src/data/types';

const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root,'public/data/players.json'),'utf8')) as Players;
const meta = JSON.parse(fs.readFileSync(path.join(root,'public/data/meta.json'),'utf8')) as Meta;
const masterFile = locate(path.join(root,'data/source'),/^Playerwise_Master_Pressure_Scores(?:\s*\(\d+\))?\.xlsx$/i)!;
const matchFile = locate(path.join(root,'data/source'),/^Matchwise_Pressure_Corrected(?:\s*\(\d+\))?\.xlsx$/i)!;
const master = book(masterFile), mwBook = book(matchFile,['Batter_Matchwise_Pressure','Bowler_Matchwise_Pressure']);
const raw = {B:sheet(master,masterFile,'Option_B_Bayesian',[]),C:sheet(master,masterFile,'Option_C_Consistency',[])};
const audit = sheet(master,masterFile,'Match_Weights_Audit',[]);
const history: Record<Role,History> = {batter:JSON.parse(fs.readFileSync('public/data/history.batter.json','utf8')),bowler:JSON.parse(fs.readFileSync('public/data/history.bowler.json','utf8'))};
const mw: Record<Role,Map<string,Row>> = {batter:new Map(),bowler:new Map()};
for (const role of ['batter','bowler'] as const) for (const r of sheet(mwBook,matchFile,role === 'batter' ? 'Batter_Matchwise_Pressure' : 'Bowler_Matchwise_Pressure',[])) mw[role].set(`${r.match_id}:${r.player_id}`,r);
let allChecks = 0;
for (const method of ['B','C'] as const) {
  assert.equal(data.records.length,raw[method].length);
  const index = new Map(raw[method].map(r=>[`${String(r.role).toLowerCase()}:${r.player_id}`,r]));
  for (const record of data.records) {
    const r = index.get(`${record.role}:${record.playerId}`); assert.ok(r);
    assert.equal(record.methods[method].master,r.master_pressure_score);
    assert.equal(record.methods[method].rank,r.role_rank);
    assert.equal(record.matches,r.matches_played);
    const population = raw[method].filter(v=>v.role===r.role);
    const lower = population.filter(v=>typeof v.master_pressure_score==='number' && typeof r.master_pressure_score==='number' && v.master_pressure_score < r.master_pressure_score-1e-9).length;
    assert.equal(record.methods[method].percentile,population.length<2 ? null : Math.floor(lower/(population.length-1)*100+0.5));
    allChecks += 4;
  }
}
const sampleKeys = new Set<string>();
const add = (r: RoleRecord | undefined) => { if(r) sampleKeys.add(`${r.role}:${r.playerId}`); };
for(const method of ['B','C'] as const) for(const role of ['batter','bowler'] as const) data.records.filter(r=>r.role===role).sort((a,b)=>a.methods[method].rank!-b.methods[method].rank!).slice(0,3).forEach(add);
add(data.records.find(r=>data.identities.find(p=>p.playerId===r.playerId)!.roles.length===2));
add(data.records.find(r=>r.matches===1));
add(data.records.find(r=>data.identities.find(p=>p.playerId===r.playerId)!.hasNameCollision));
add([...data.records].sort((a,b)=>Math.abs(b.methods.C.rankDiffVsB ?? 0)-Math.abs(a.methods.C.rankDiffVsB ?? 0))[0]);
for(const r of data.records) { if(sampleKeys.size>=10) break; add(r); }
const results = [];
for(const key of sampleKeys) {
  const record = data.records.find(r=>`${r.role}:${r.playerId}`===key)!;
  const observations = audit.filter(r=>String(r.role).toLowerCase()===record.role && r.player_id===record.playerId);
  const average = (column: string) => {
    let numerator=0, denominator=0;
    for(const row of observations) {
      const match = mw[record.role].get(`${row.match_id}:${row.player_id}`); assert.ok(match);
      const v = num(match[column],column), w = num(row.recency_weight,'weight')!;
      if(v!==null) { numerator+=w*v; denominator+=w; }
    }
    return denominator>0 ? numerator/denominator : null;
  };
  const realtime = average('Adjusted_Realtime_Score_R'), individual = average('Individual_Player_Score_I');
  assert.ok(realtime===null ? record.supporting.realtimeAvg===null : Math.abs(realtime-record.supporting.realtimeAvg!)<1e-9);
  assert.ok(individual===null ? record.supporting.individualAvg===null : Math.abs(individual-record.supporting.individualAvg!)<1e-9);
  const dated = observations.filter(r=>iso(r.match_date)!==null).sort((a,b)=>iso(a.match_date)!.localeCompare(iso(b.match_date)!) || Number(a.match_id)-Number(b.match_id)).slice(-10);
  const trend = history[record.role][record.playerId].filter(r=>r.date!==null).slice(-10);
  assert.deepEqual(trend.map(r=>[r.matchId,r.date,r.final]),dated.map(r=>[r.match_id,iso(r.match_date),r.Final_Pressure_Score]));
  const b = raw.B.find(r=>String(r.role).toLowerCase()===record.role && r.player_id===record.playerId)!;
  assert.equal(record.effectiveSampleSize,b.effective_sample_size);
  const identity = data.identities.find(p=>p.playerId===record.playerId)!;
  const values = {B:record.methods.B,C:record.methods.C,matches:record.matches,ESS:record.effectiveSampleSize,realtime,individual,last10:trend};
  console.log(`${identity.name} [${record.role}, ID ${record.playerId}] — UI | Excel`);
  console.log(`  B ${record.methods.B.master} | ${b.master_pressure_score}; C ${record.methods.C.master} | ${raw.C.find(r=>String(r.role).toLowerCase()===record.role && r.player_id===record.playerId)!.master_pressure_score}; ranks ${record.methods.B.rank}/${record.methods.C.rank}; percentile ${record.methods.B.percentile}/${record.methods.C.percentile}; matches ${record.matches}; ESS ${record.effectiveSampleSize}`);
  console.log(`  Realtime ${record.supporting.realtimeAvg} | ${realtime}; Individual ${record.supporting.individualAvg} | ${individual}`);
  console.log(`  Last 10 (UI = Excel): ${trend.map(r=>`${r.date}: ${r.final}`).join('; ')}`);
  results.push({playerId:record.playerId,role:record.role,name:identity.name,passed:true,values});
}
const output={generatedAt:new Date().toISOString(),status:'passed',allRecordChecks:allChecks,roleRecords:data.records.length,sampledPlayers:results.length,population:meta.population,results};
fs.mkdirSync('test-results',{recursive:true}); fs.writeFileSync('test-results/source-verification.json',JSON.stringify(output,null,2));
console.log(`PASS — ${allChecks} exact source checks; ${results.length} sampled role profiles and their supporting averages / trends; zero mismatches.`);
