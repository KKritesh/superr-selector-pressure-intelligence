import type { Observation } from '../data/types';
import { FORM_MIN_MATCHES, FORM_THRESHOLD } from '../config/constants';
export function datedHistory(observations:Observation[]):Observation[]{return observations.filter(o=>o.date!==null).slice().sort((a,b)=>a.date!.localeCompare(b.date!)||a.matchId-b.matchId);}
export function visibleHistory(observations:Observation[],all=false):Observation[]{const dated=datedHistory(observations);return all?dated:dated.slice(-10);}
export function formIndicator(observations:Observation[]):{text:string;tone:'up'|'down'|'steady'}|null{
  const dated=datedHistory(observations);if(!dated.length)return null;
  if(dated.length<FORM_MIN_MATCHES)return {text:'Not enough history for a form read',tone:'steady'};
  const average=(rows:Observation[])=>rows.reduce((sum,r)=>sum+r.final,0)/rows.length;
  const delta=average(dated.slice(-5))-average(dated.slice(-10,-5));
  if(delta>=FORM_THRESHOLD)return {text:'Recent form above earlier form ▲',tone:'up'};
  if(delta<=-FORM_THRESHOLD)return {text:'Recent form below earlier form ▼',tone:'down'};
  return {text:'Steady ▬',tone:'steady'};
}
