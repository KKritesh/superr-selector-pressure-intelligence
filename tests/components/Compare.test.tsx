import fs from 'node:fs';
import { render,screen,fireEvent,within,waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { DataProvider } from '../../src/data/DataProvider';
import ComparePage from '../../src/pages/ComparePage';
import { MethodSelector } from '../../src/components/common/Selectors';
const meta=JSON.parse(fs.readFileSync('public/data/meta.json','utf8')),players=JSON.parse(fs.readFileSync('public/data/players.json','utf8'));
const batter=JSON.parse(fs.readFileSync('public/data/history.batter.json','utf8')),bowler=JSON.parse(fs.readFileSync('public/data/history.bowler.json','utf8'));
vi.mock('recharts',async()=>{const original=await vi.importActual<typeof import('recharts')>('recharts');return {...original,ResponsiveContainer:({children}:{children:React.ReactElement})=><div>{children}</div>};});
function setup(hash:string){window.location.hash=hash;vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('meta')?meta:url.includes('history.batter')?batter:url.includes('history.bowler')?bowler:players})));}
afterEach(()=>vi.unstubAllGlobals());
describe('comparison interactions with actual scores',()=>{
  it('restores a shortlist, gives matching profile values, changes methods and removes players',async()=>{
    setup('/compare?role=batter&ids=6281,50284,4117&m=B');render(<HashRouter><DataProvider><MethodSelector/><ComparePage/></DataProvider></HashRouter>);
    const verdict=await screen.findByRole('region',{name:'Comparison Verdict'});expect(verdict).toHaveTextContent('Abhishek Sharma leads');expect(verdict).toHaveTextContent('(41.8)');
    const table=screen.getByRole('table',{name:'Pressure performance comparison for 3 batters'});expect(within(table).getAllByRole('row')).toHaveLength(7);
    fireEvent.click(screen.getByRole('radio',{name:'Option C — Consistency Adjusted'}));expect(verdict).toHaveTextContent('(40.7)');expect(verdict).toHaveTextContent('Option C — Consistency Adjusted');
    fireEvent.click(screen.getByRole('button',{name:'Remove Ishan Kishan'}));expect(screen.getByRole('table',{name:'Pressure performance comparison for 2 batters'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Remove Vaibhav Sooryavanshi'}));expect(screen.queryByRole('region',{name:'Comparison Verdict'})).not.toBeInTheDocument();expect(screen.getByRole('heading',{name:'Add at least two players to compare.'})).toBeInTheDocument();expect(screen.getByRole('combobox')).toHaveFocus();
  });
  it('prevents duplicates, allows five only and retains eligible players when role changes',async()=>{
    setup('/compare?role=batter&ids=6281&m=B');render(<HashRouter><DataProvider><ComparePage/></DataProvider></HashRouter>);
    const input=await screen.findByRole('combobox');fireEvent.change(input,{target:{value:'Abhishek Sharma'}});expect(screen.getByText('Added')).toBeInTheDocument();
    fireEvent.keyDown(input,{key:'ArrowDown'});fireEvent.keyDown(input,{key:'Enter'});expect(screen.getByText('Selected 1 of 5')).toBeInTheDocument();
    const ids=players.records.filter((r:{role:string})=>r.role==='batter').slice(0,5).map((r:{playerId:number})=>r.playerId);
    window.location.hash=`/compare?role=batter&ids=${ids.join(',')}&m=B`;await waitFor(()=>expect(screen.getByRole('combobox')).toBeDisabled());expect(screen.getByRole('combobox')).toHaveAttribute('placeholder','Maximum 5 players');
    fireEvent.click(screen.getByRole('radio',{name:'Bowler'}));await waitFor(()=>expect(window.location.hash).toContain('role=bowler'));
    const retained=ids.filter((id:number)=>players.records.some((r:{role:string;playerId:number})=>r.role==='bowler'&&r.playerId===id));
    expect(screen.getByText(`Selected ${retained.length} of 5`)).toBeInTheDocument();if(retained.length<5)expect(screen.getByText(/Removed 2 players/)).toBeInTheDocument();
  });
  it('normalizes incompatible and duplicate IDs from a deep link',async()=>{
    setup('/compare?role=bowler&ids=6281,6281,999999,not-an-id&m=B');render(<HashRouter><DataProvider><ComparePage/></DataProvider></HashRouter>);
    await screen.findByRole('combobox');await waitFor(()=>expect(window.location.hash).not.toContain('999999'));expect(window.location.hash).toContain('ids=6281');expect(screen.getByText('Selected 1 of 5')).toBeInTheDocument();
  });
});
