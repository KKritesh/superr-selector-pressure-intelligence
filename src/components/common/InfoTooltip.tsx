import { useId, useState } from 'react';
import { Info } from 'lucide-react';
export function InfoTooltip({text,label='About this metric'}:{text:string;label?:string}) {
  const id=useId(), [open,setOpen]=useState(false);
  return <span className="tooltip-wrap"><button className="info-button" type="button" aria-label={label} aria-describedby={open?id:undefined} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onClick={()=>setOpen(v=>!v)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><Info size={14}/></button>{open&&<span className="tooltip" role="tooltip" id={id}>{text}</span>}</span>;
}
