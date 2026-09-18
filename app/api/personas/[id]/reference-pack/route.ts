import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitReferencePackImage } from "@/lib/ai/providers/fal-reference-pack";

const views = [
  ["FACE_FRONT", "front-facing close portrait, neutral expression, eyes into camera"],
  ["FACE_LEFT_3Q", "close portrait, head turned about 35 degrees to the person's left, three-quarter view"],
  ["FACE_RIGHT_3Q", "close portrait, head turned about 35 degrees to the person's right, three-quarter view"],
  ["PROFILE_LEFT", "strict left-side facial profile portrait"],
  ["PROFILE_RIGHT", "strict right-side facial profile portrait"],
  ["UPPER_BODY", "waist-up portrait, front-facing, relaxed neutral posture"],
  ["FULL_BODY_FRONT", "full-body front-facing standing portrait, entire person visible head to toe"],
  ["FULL_BODY_SIDE", "full-body side-view standing portrait, entire person visible head to toe"]
] as const;

export async function POST(_: Request, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const persona = await db.persona.findUnique({ where:{ id }, include:{ references:true } });
  if (!persona) return NextResponse.json({error:"Persona not found"},{status:404});
  const master = persona.references.find(r=>r.type==="MASTER" && r.review==="APPROVED");
  if (!master) return NextResponse.json({error:"Approve a Master Portrait first"},{status:409});

  const submitted=[];
  for (const [type,view] of views) {
    const prompt = [
      "Use the supplied image as the canonical identity reference.",
      "Preserve exactly the same synthetic adult person's facial identity, age appearance, skin tone, eye color, hair identity and distinctive facial geometry.",
      "Do not beautify into a different person. Do not change ethnicity or apparent age.",
      view + ".",
      "Reference-pack photography: neutral grey studio background, simple neutral fitted clothing, realistic anatomy, natural skin texture, soft even lighting, no text, no watermark."
    ].join("\n");
    const generation=await db.generation.create({data:{personaId:id,type:"IMAGE",provider:"fal.ai",model:"fal-ai/flux-2/edit",prompt,finalPrompt:prompt,referenceImageIds:[master.id]}});
    try {
      const job=await submitReferencePackImage({prompt,masterUrl:master.url,webhookUrl:`${process.env.APP_URL}/api/webhooks/fal?generationId=${generation.id}&kind=reference-pack&referenceType=${type}`});
      await db.generation.update({where:{id:generation.id},data:{providerRequestId:job.requestId,status:"PROCESSING"}});
      submitted.push({type,generationId:generation.id,requestId:job.requestId});
    } catch(error) {
      await db.generation.update({where:{id:generation.id},data:{status:"FAILED",errorMessage:error instanceof Error?error.message:"Provider error"}});
    }
  }
  return NextResponse.json({submitted},{status:202});
}
