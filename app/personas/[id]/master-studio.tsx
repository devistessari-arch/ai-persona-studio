"use client";
import { useState } from "react";

type Ref = { id:string; url:string; review:string; type:string };

export default function MasterStudio({ personaId, initialReferences }: { personaId:string; initialReferences:Ref[] }) {
  const [refs,setRefs]=useState(initialReferences);
  const [busy,setBusy]=useState(false);
  const masters=refs.filter(r=>r.type==="MASTER");
  async function generate(){setBusy(true);const r=await fetch(`/api/personas/${personaId}/master-candidates`,{method:"POST"});setBusy(false);if(r.ok) alert("Generazione avviata. I 4 candidati compariranno quando il job fal.ai sarà completato.");else alert("Impossibile avviare la generazione. Verifica FAL_KEY e configurazione server.");}
  async function approve(id:string){const r=await fetch(`/api/references/${id}/approve-master`,{method:"POST"});if(r.ok)setRefs(refs.map(x=>x.type==="MASTER"?{...x,review:x.id===id?"APPROVED":"REJECTED"}:x));}
  return <section><div className="studioHead"><div><p className="eyebrow">MASTER PORTRAIT</p><h2>Scegli il volto canonico</h2></div><button onClick={generate} disabled={busy}>{busy?"Invio...":"Generate 4 candidates"}</button></div>{masters.length===0?<div className="emptyState">Nessun Master Portrait ancora generato.</div>:<div className="portraitGrid">{masters.map(x=><article className={x.review==="APPROVED"?"portrait approved":"portrait"} key={x.id}><img src={x.url} alt="Synthetic master candidate"/><div><span>{x.review}</span><button onClick={()=>approve(x.id)} disabled={x.review==="APPROVED"}>{x.review==="APPROVED"?"MASTER ✓":"Use as Master"}</button></div></article>)}</div>}</section>;
}
