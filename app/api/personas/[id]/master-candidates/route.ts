import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitMasterCandidates } from "@/lib/ai/providers/fal-bootstrap";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const persona=await db.persona.findUnique({where:{id},include:{identityProfile:true}});
 if(!persona?.identityProfile)return NextResponse.json({error:"Persona not found"},{status:404});
 const t=persona.identityProfile.immutableTraits as Record<string,unknown>;
 const prompt=["Photorealistic premium casting portrait of a completely synthetic adult person, not a real individual.",`Apparent age: ${persona.apparentAge}. Gender presentation: ${persona.genderPresentation}.`,`Canonical traits: ${JSON.stringify(t)}.`,"Neutral confident expression, shoulders visible, looking into camera, clean understated studio background.","Natural skin pores and texture, realistic hair strands, anatomically plausible face, subtle asymmetry, authentic photographic lighting.","85mm portrait photography, shallow depth of field, editorial casting photo, no text, no watermark."].join("\n");
 const generation=await db.generation.create({data:{personaId:id,type:"IMAGE",provider:"fal.ai",model:"fal-ai/flux-2",prompt,finalPrompt:prompt,referenceImageIds:[]}});
 try{const job=await submitMasterCandidates(prompt,`${process.env.APP_URL}/api/webhooks/fal?generationId=${generation.id}&kind=master-candidates`);await db.generation.update({where:{id:generation.id},data:{providerRequestId:job.requestId || undefined,status:"PROCESSING"}});return NextResponse.json({generationId:generation.id,requestId:job.requestId},{status:202})}
 catch(error){await db.generation.update({where:{id:generation.id},data:{status:"FAILED",errorMessage:error instanceof Error?error.message:"Provider error"}});return NextResponse.json({error:"Unable to submit generation"},{status:500})}
}