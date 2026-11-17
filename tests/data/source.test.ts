// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import XLSX from 'xlsx';
import { buildData } from '../../scripts/build-data';
import { book, sheet, locate } from '../../scripts/lib/excel';
import type { Players } from '../../src/data/types';

describe('source fidelity for every production record',()=>{
  it('copies all master scores, ranks, roles and match counts exactly under both methods',()=>{
    const players = JSON.parse(fs.readFileSync('public/data/players.json','utf8')) as Players;
    const file = locate('data/source',/^Playerwise_Master_Pressure_Scores(?:\s*\(\d+\))?\.xlsx$/i)!;
    const wb = book(file);
    for(const method of ['B','C'] as const) {
      const rows = sheet(wb,file,method==='B'?'Option_B_Bayesian':'Option_C_Consistency',[]);
      expect(players.records).toHaveLength(rows.length);
      const index = new Map(rows.map(r=>[`${String(r.role).toLowerCase()}:${r.player_id}`,r]));
      for(const record of players.records) {
        const source = index.get(`${record.role}:${record.playerId}`)!;
        expect(source).toBeDefined();
        expect(record.methods[method].master).toBe(source.master_pressure_score);
        expect(record.methods[method].rank).toBe(source.role_rank);
        expect(record.matches).toBe(source.matches_played);
      }
    }
  });
});

describe('refresh and failure behavior using isolated test fixtures',()=>{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'superr-pipeline-test-'));
  afterAll(()=>fs.rmSync(dir,{recursive:true,force:true}));
  function fixture(n: number, broken = false) {
    const wb = XLSX.utils.book_new(), matchBook = XLSX.utils.book_new();
    const bs = Array.from({length:n},(_,i)=>({role:'Batter',player_id:i+1,player_name:`Test player ${i+1}`,player_nationality:'Test',played_in_last_2_years:'Yes',matches_played:1,first_match_date:'2026-11-17',last_match_date:'2026-11-17',recency_weighted_average:20-i,sum_recency_weights:1,effective_sample_size:1,role_benchmark_mu:20,shrinkage_k:5,bayesian_adjusted_score:20-i,master_pressure_score:20-i,role_rank:i+1}));
    const cs = bs.map(r=>({...r,weighted_standard_deviation:0,consistency_lambda:1,consistency_penalty:0,rank_difference_vs_B:0}));
    const audit=bs.map(r=>({role:r.role,player_id:r.player_id,match_id:100+r.player_id,match_date:r.last_match_date,match_age_days:0,Final_Pressure_Score:r.master_pressure_score,recency_weight:1}));
    const mapping=bs.map(r=>({player_id:r.player_id,player_name:r.player_name,player_country:'Test',played_in_last_2_years:'Yes'}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(broken?bs.map(({role_rank: _rank,...r})=>r):bs),'Option_B_Bayesian');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cs),'Option_C_Consistency');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(audit),'Match_Weights_Audit');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(mapping),'Player_Mapping');
    const match=bs.map(r=>({match_id:100+r.player_id,player_id:r.player_id,Adjusted_Realtime_Score_R:r.master_pressure_score,Individual_Player_Score_I:r.master_pressure_score,Final_Pressure_Score:r.master_pressure_score}));
    XLSX.utils.book_append_sheet(matchBook,XLSX.utils.json_to_sheet(match),'Batter_Matchwise_Pressure');
    XLSX.utils.book_append_sheet(matchBook,XLSX.utils.aoa_to_sheet([Object.keys(match[0])]),'Bowler_Matchwise_Pressure');
    XLSX.writeFile(wb,path.join(dir,'Playerwise_Master_Pressure_Scores.xlsx'));
    XLSX.writeFile(matchBook,path.join(dir,'Matchwise_Pressure_Corrected (1).xlsx'));
  }
  it('accepts suffix variants and new source players without code changes',()=>{
    fixture(2); const out=path.join(dir,'generated'); buildData(dir,out);
    expect(JSON.parse(fs.readFileSync(path.join(out,'players.json'),'utf8')).records).toHaveLength(2);
    fixture(3); buildData(dir,out);
    expect(JSON.parse(fs.readFileSync(path.join(out,'meta.json'),'utf8')).population.B.batter).toBe(3);
    expect(JSON.parse(fs.readFileSync(path.join(out,'players.json'),'utf8')).identities.at(-1).name).toBe('Test player 3');
  });
  it('names the missing header and leaves previous JSON untouched',()=>{
    const out=path.join(dir,'generated'), before=fs.readFileSync(path.join(out,'players.json'),'utf8'); fixture(3,true);
    expect(()=>buildData(dir,out)).toThrow(/Option_B_Bayesian.*missing column.*role_rank/);
    expect(fs.readFileSync(path.join(out,'players.json'),'utf8')).toBe(before);
  });
});
