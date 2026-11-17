import { render, screen, fireEvent, within } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import fs from 'node:fs';
import { vi } from 'vitest';
import { DataProvider } from '../../src/data/DataProvider';
import HomePage from '../../src/pages/HomePage';
import { MethodSelector } from '../../src/components/common/Selectors';
const meta=JSON.parse(fs.readFileSync('public/data/meta.json','utf8'));
const players=JSON.parse(fs.readFileSync('public/data/players.json','utf8'));
describe('rankings with real imported data',()=>{
  beforeEach(()=>{window.location.hash='/';vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('meta')?meta:players})));});
  afterEach(()=>vi.unstubAllGlobals());
  it('renders the top ten in each role and preserves independent paging through method changes',async()=>{
    render(<HashRouter><DataProvider><MethodSelector/><HomePage/></DataProvider></HashRouter>);
    const batting=await screen.findByRole('table',{name:'Batting pressure rankings'}),bowling=screen.getByRole('table',{name:'Bowling pressure rankings'});
    expect(within(batting).getAllByRole('row')).toHaveLength(11);expect(within(bowling).getAllByRole('row')).toHaveLength(11);
    expect(within(batting).getAllByRole('row')[1]).toHaveTextContent('Abhishek Sharma');expect(within(bowling).getAllByRole('row')[1]).toHaveTextContent('Rashid Khan');
    fireEvent.click(screen.getByRole('button',{name:'See more batters'}));
    expect(within(batting).getAllByRole('row')).toHaveLength(51);expect(within(bowling).getAllByRole('row')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button',{name:'Page 2'}));fireEvent.click(screen.getByRole('button',{name:'Page 3'}));expect(window.location.hash).toContain('bp=3');
    fireEvent.click(screen.getByRole('radio',{name:'Option C — Consistency Adjusted'}));
    expect(window.location.hash).toContain('m=C');expect(window.location.hash).toContain('bp=3');
    const rank101=players.records.find((r:{role:string;methods:{C:{rank:number}}})=>r.role==='batter'&&r.methods.C.rank===101);
    const name=players.identities.find((p:{playerId:number})=>p.playerId===rank101.playerId).name;
    expect(within(batting).getAllByRole('row')[1]).toHaveTextContent(name);
    expect(within(bowling).getAllByRole('row')).toHaveLength(11);
  });
});
