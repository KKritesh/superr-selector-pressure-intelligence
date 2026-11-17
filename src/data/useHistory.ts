import { useEffect, useState } from 'react';
import { loadHistory } from './loader';
import type { History, Role } from './types';
export function useHistory(role:Role){
  const [state,setState]=useState<{role:Role;data:History|null;error:boolean}>({role,data:null,error:false}),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let live=true;setState({role,data:null,error:false});loadHistory(role).then(data=>{if(live)setState({role,data,error:false});}).catch(()=>{if(live)setState({role,data:null,error:true});});return()=>{live=false;};},[role,attempt]);
  return {data:state.role===role?state.data:null,error:state.role===role&&state.error,retry:()=>setAttempt(v=>v+1)};
}
