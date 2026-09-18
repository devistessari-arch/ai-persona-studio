"use client";
import { useEffect, useState } from "react";
type Ref={id:string;url:string;review:string;type:string};
export default function MasterStudio({personaId,initialReferences}:{personaId:string;initialReferences:Ref[]}){
 const [refs,setRefs]=useState(initialReferences),[busy,setBusy]=useState(false),[recoverBusy,setRecoverBusy]=useState(false),[uploadBusy,setUploadBusy]=useState(false),[rights,setRights]=useState(false),[packBusy,setPackBusy]=useState(false),[pending,setPending]=useState(0);
 const masters=refs.filter(r=>r.type==="MASTER"), pack=refs.filter(r=>r.type!=="MASTER"), approved=masters.some(r=>r.review==="APPROVED");
 async function refresh(){const r=await fetch(`/api/personas/${personaId}/references`,{cache:"no-store"});if(r.ok){const d=await r.json();setRefs(d.references);setPending(d.pendingGenerations)}}
 useEffect(()=>{const t=setInterval(refresh,5000);return()=>clearInterval(t)},[]);
 async function generate(){setBusy(true);const r=await fetch(`/api/personas/${personaId}/master-candidates`,{method:"POST"});setBusy(false);if(r.ok){setPending(x=>x+1)}else{let message=`Errore ${r.status}`;try{const d=await r.json();if(d?.error)message=d.error}catch{}alert(`Impossibile avviare la generazione.\n\n${message}`)}}
 async function recover(){setRecoverBusy(true);const r=await fetch(`/api/personas/${personaId}/recover-master`,{method:"POST"});setRecoverBusy(false);const d=await r.json().catch(()=>null);if(r.ok){await refresh();alert(`Recuperate ${d?.recovered??0} immagini dalla generazione precedente.`)}else alert(d?.error??"Nessuna immagine precedente recuperabile.")}
 async function uploadRealPhoto(file:File|null){if(!file)return;if(!rights){alert("Prima conferma di avere il diritto di utilizzare questa foto.");return}setUploadBusy(true);const form=new FormData();form.append("image",file);form.append("rightsConfirmed","true");const r=await fetch(`/api/personas/${personaId}/real-photo-source`,{method:"POST",body:form});setUploadBusy(false);const d=await r.json().catch(()=>null);if(r.ok){setPending(x=>x+1);alert("Foto inviata. Sto creando 4 identità sintetiche distinte; compariranno qui al termine.")}else alert(d?.error??"Impossibile avviare la trasformazione.")}
 async function approve(id:string){const r=await fetch(`/api/references/${id}/approve-master`,{method:"POST"});if(r.ok)await refresh()}
 async function generatePack(){setPackBusy(true);const r=await fetch(`/api/personas/${personaId}/reference-pack`,{method:"POST"});setPackBusy(false);if(r.ok)await refresh();else alert("Prima approva un Master Portrait.")}
 async function review(id:string,review:"APPROVED"|"REJECTED"){await fetch(`/api/references/${id}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({review})});await refresh()}
 return <section>
  <div className="studioHead"><div><p className="eyebrow">MASTER PORTRAIT</p><h2>Scegli il volto canonico</h2><small>{pending>0?`${pending} generazioni in elaborazione…`:""}</small></div><button onClick={generate} disabled={busy}>{busy?"Invio…":"Generate 4 candidates"}</button></div>
  <div className="emptyState" style={{marginBottom:24,textAlign:"left"}}>
   <p className="eyebrow">REAL PHOTO → SYNTHETIC PERSONA</p>
   <h3>Parti da una fotografia reale</h3>
   <p>La foto sorgente non diventerà il Master: verrà usata per generare 4 candidati con identità sintetica materialmente diversa, mantenendo realismo, luce e naturalezza fotografica.</p>
   <label style={{display:"block",margin:"12px 0"}}><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> Confermo di avere il diritto di utilizzare questa fotografia.</label>
   <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadBusy} onChange={e=>uploadRealPhoto(e.target.files?.[0]??null)}/>
   <small style={{display:"block",marginTop:8}}>JPG, PNG o WEBP · max 10 MB. La somiglianza con la persona reale non verrà preservata intenzionalmente.</small>
  </div>
  {masters.length===0?<div className="emptyState"><p>Nessun Master Portrait ancora generato.</p><button onClick={recover} disabled={recoverBusy}>{recoverBusy?"Recupero…":"Recupera generazione precedente"}</button></div>:<div className="portraitGrid">{masters.map(x=><article className={x.review==="APPROVED"?"portrait approved":"portrait"} key={x.id}><img src={x.url} alt="Synthetic master candidate"/><div><span>{x.review}</span><button onClick={()=>approve(x.id)} disabled={x.review==="APPROVED"}>{x.review==="APPROVED"?"MASTER ✓":"Use as Master"}</button></div></article>)}</div>}
  {approved&&<><div className="studioHead referenceTitle"><div><p className="eyebrow">IDENTITY LOCK</p><h2>Reference Pack</h2><small>8 viste per stabilizzare l'identità nei photoshoot.</small></div><button onClick={generatePack} disabled={packBusy}>{packBusy?"Invio…":pack.length?"Regenerate Pack":"Generate Reference Pack"}</button></div>
  {pack.length===0?<div className="emptyState">Il Master è approvato. Genera il Reference Pack.</div>:<div className="referenceGrid">{pack.map(x=><article className={x.review==="APPROVED"?"portrait approved":"portrait"} key={x.id}><img src={x.url} alt={x.type}/><div className="reviewBar"><span>{x.type.replaceAll("_"," ")}</span><div><button onClick={()=>review(x.id,"APPROVED")}>✓</button><button onClick={()=>review(x.id,"REJECTED")}>×</button></div></div></article>)}</div>}</>}
 </section>
}