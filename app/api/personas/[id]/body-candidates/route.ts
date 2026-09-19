import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitBodyBlueprint } from "@/lib/ai/providers/fal-body";

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
  "Create ONE ultra-photorealistic vertical full-body BODY BLUEPRINT for a completely synthetic adult person.",
  "This first stage defines body proportions and composition only. A canonical face will be applied in a separate identity-compositing stage.",
  `Apparent age: ${persona.apparentAge}. Gender presentation: ${persona.genderPresentation}.`,
  `Persona body description: ${persona.bodyDescription||"natural anatomically plausible adult body"}.`,
  `Canonical traits relevant to physique and skin: ${JSON.stringify(traits)}.`,
  "MANDATORY COMPOSITION: one person only, standing naturally, complete body visible from top of head to both feet, visible floor below both feet, margin above head, body occupying about 75-85% of a tall vertical frame.",
  "Use a neutral front or very slight three-quarter stance, arms relaxed and separated enough from the torso to read silhouette and proportions.",
  "Establish realistic shoulder width, chest proportions, torso length, waist, pelvis width, hip contour, arm and leg proportions, muscle tone, body-fat distribution and posture.",
  presentation,
  "Extreme photographic realism: ordinary unretouched camera photograph, realistic skin, hands, fingers, joints, knees and feet, natural lens perspective and diffused light. No collage, contact sheet, duplicated person, CGI, illustration, glamour rendering or text."
 ].join("\n");
 const generation=await db.generation.create({data:{personaId:id,type:"IMAGE",provider:"fal.ai",model:"fal-ai/flux-2",prompt,finalPrompt:prompt,referenceImageIds:[master.id]}});
 try{
  const origin=process.env.APP_URL?.trim()||(process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/^https?:\/\//,"")}`:new URL(request.url).origin);
  const webhookUrl=new URL(`/api/webhooks/fal?generationId=${generation.id}&kind=body-blueprint&faceMasterId=${master.id}`,origin).toString();
  const job=await submitBodyBlueprint({prompt,webhookUrl});
  await db.generation.update({where:{id:generation.id},data:{status:"PROCESSING",providerRequestId:job.requestId}});
  return NextResponse.json({generationId:generation.id,requestId:job.requestId},{status:202});
 }catch(error){
  const message=error instanceof Error?error.message:"Provider error";
  await db.generation.update({where:{id:generation.id},data:{status:"FAILED",errorMessage:message}});
  return NextResponse.json({error:message},{status:500});
 }
}
