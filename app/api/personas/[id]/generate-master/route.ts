import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildPersonaPrompt } from "@/lib/ai/prompt-builder";
import { FalFluxKontextProvider } from "@/lib/ai/providers/fal";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await db.persona.findUnique({ where: { id }, include: { identityProfile: true, references: true } });
  if (!persona?.identityProfile) return NextResponse.json({ error: "Persona not found" }, { status: 404 });

  const approvedMaster = persona.references.find(r => r.type === "MASTER" && r.review === "APPROVED");
  if (!approvedMaster) {
    return NextResponse.json({
      error: "Bootstrap required",
      message: "Il primo Master Portrait deve essere creato senza reference image. Il provider Kontext viene usato dopo l'approvazione del Master."
    }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const finalPrompt = buildPersonaPrompt({
    immutableTraits: persona.identityProfile.immutableTraits as Record<string, unknown>,
    userRequest: body.prompt ?? "neutral premium studio portrait, front-facing",
    preset: "Master Portrait",
    camera: "85mm portrait lens",
    identityStrength: persona.identityStrength
  });

  const generation = await db.generation.create({
    data: {
      personaId: persona.id, type: "IMAGE", provider: "fal.ai", model: "fal-ai/flux-pro/kontext",
      prompt: body.prompt ?? "Master Portrait variation", finalPrompt, referenceImageIds: [approvedMaster.id]
    }
  });

  const provider = new FalFluxKontextProvider();
  const job = await provider.submit({
    prompt: finalPrompt, referenceUrls: [approvedMaster.url], aspectRatio: "4:5", identityStrength: persona.identityStrength
  }, `${process.env.APP_URL}/api/webhooks/fal`);

  await db.generation.update({ where: { id: generation.id }, data: { providerRequestId: job.requestId } });
  return NextResponse.json({ generationId: generation.id, requestId: job.requestId }, { status: 202 });
}
