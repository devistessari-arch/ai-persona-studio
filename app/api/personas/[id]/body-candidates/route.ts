import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitBodyCandidates } from "@/lib/ai/providers/fal-body";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const persona=await db.persona.findUnique({where:{id},include:{identityProfile:true,references:true}});
 if(!persona?.identityProfile)return NextResponse.json({error:"Persona non trovata"},{status:404});
 const master=persona.references.find(r=>r.type==="MASTER"&&r.review==="APPROVED");
 if(!master)return NextResponse.json({error:"Approva prima il Master Face"},{status:409});
 const traits=persona.identityProfile.immutableTraits as Record<string,unknown>;
 const input=await request.json().catch(()=>({})) as {bodyMode?:string};
 const bodyMode=input.bodyMode==="ANATOMICAL_REFERENCE"?"ANATOMICAL_REFERENCE":"FITTED";
 const presentation=bodyMode==="ANATOMICAL_REFERENCE"
  ? "Adult anatomical reference presentation: neutral non-sexualized standing pose, uncovered upper torso for accurate chest and skin reference, while the pelvic and intimate area remains fully covered by opaque neutral briefs. No erotic posing or sexual activity."
  : "Use simple fitted everyday clothing that clearly communicates body proportions without nudity or sexualized presentation.";
 const prompt=[
  "Create four ultra-photorealistic full-body photographs of the exact same synthetic adult identity shown in the canonical face reference.",
  "FACE LOCK: preserve the canonical face identity with maximum fidelity: facial geometry, apparent age, complexion, eyes, hair identity and distinctive traits. Do not redesign or beautify the face.",
  `Persona body description: ${persona.bodyDescription||"natural anatomically plausible adult body"}.`,
  `Canonical traits: ${JSON.stringify(traits)}.`,
  "BODY CREATION: show the entire body head-to-toe in a relaxed standing front or slight three-quarter pose. Create a natural, anatomically plausible physique consistent with the persona description.",
  "REALISM: genuine unretouched camera-photo appearance, realistic skin texture and tonal variation, natural joints, hands, fingers, shoulders, waist, hips, knees and feet. Avoid mannequin proportions, plastic skin, impossible anatomy and exaggerated features.",
  presentation,
  "Neutral real-world or simple studio environment, natural diffused light, restrained sharpening, realistic lens perspective, subtle sensor grain. No CGI, illustration, HDR, glamour rendering or text.",
  "All four outputs must preserve ONE face identity while offering small natural variations in body proportions for Master Body selection."
 ].join("\n");
 const generation=await db.generation.create({data:{personaId:id,type:"IMAGE",provider:"fal.ai",model:"fal-ai/flux-2/edit",prompt,finalPrompt:prompt,referenceImageIds:[master.id]}});
 try{
  const origin=process.env.APP_URL?.trim()||(process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/^https?:\/\//,"")}`:new URL(request.url).origin);
  const webhookUrl=new URL(`/api/webhooks/fal?generationId=${generation.id}&kind=body-candidates&referenceType=BODY_CANDIDATE`,origin).toString();
  const job=await submitBodyCandidates({prompt,masterUrl:master.url,webhookUrl});
  await db.generation.update({where:{id:generation.id},data:{status:"PROCESSING",providerRequestId:job.requestId}});
  return NextResponse.json({generationId:generation.id,requestId:job.requestId},{status:202});
 }catch(error){
  const message=error instanceof Error?error.message:"Provider error";
  await db.generation.update({where:{id:generation.id},data:{status:"FAILED",errorMessage:message}});
  return NextResponse.json({error:message},{status:500});
 }
}
