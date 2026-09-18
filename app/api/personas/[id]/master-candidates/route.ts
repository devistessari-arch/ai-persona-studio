import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitMasterCandidates } from "@/lib/ai/providers/fal-bootstrap";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const persona = await db.persona.findUnique({
    where: { id },
    include: { identityProfile: true },
  });

  if (!persona?.identityProfile) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  const t = persona.identityProfile.immutableTraits as Record<string, unknown>;
  const prompt = [
    "Create a candid, highly realistic RAW-style head-and-shoulders photograph of a completely synthetic adult person who does not correspond to any real individual.",
    `Apparent age: ${persona.apparentAge}. Gender presentation: ${persona.genderPresentation}.`,
    `Canonical traits: ${JSON.stringify(t)}.`,
    "REALISM PRIORITY: the result must look like an ordinary unretouched photograph of a real human, never like CGI, digital art, a beauty render, an influencer filter, or an advertising campaign.",
    "Preserve natural human irregularities: subtle facial asymmetry, visible pores, fine skin texture, tiny blemishes and mild uneven pigmentation, faint under-eye texture, natural lip lines, peach fuzz, realistic ears and nostrils.",
    "Eyes must be physically natural: realistic sclera with subtle veins and tonal variation, non-glowing irises, ordinary catchlights, imperfect bilateral symmetry. Avoid oversized eyes and hyper-detailed fantasy irises.",
    "Hair must have believable density, flyaway hairs, baby hairs, imperfect strands and a natural hairline. Avoid sculpted glossy CGI hair.",
    "No beauty retouching, no skin smoothing, no makeup-ad finish, no plastic skin, no excessive sharpening, no HDR look, no glamour glow, no perfect symmetry.",
    "Neutral relaxed expression, shoulders visible, direct but natural gaze. Minimal everyday grooming and understated styling.",
    "Soft natural window light or simple diffused photographic light with physically plausible shadows. Neutral real-world background with slight natural imperfection.",
    "Full-frame camera realism, approximately 70-85mm portrait lens, realistic depth of field, restrained contrast, natural color response, subtle sensor grain, documentary portrait photography.",
    "Anatomically plausible face and neck, authentic skin translucency without waxiness. No text, watermark, illustration, 3D render or stylization.",
  ].join("\n");

  const generation = await db.generation.create({
    data: {
      personaId: id,
      type: "IMAGE",
      provider: "fal.ai",
      model: "fal-ai/flux-2",
      prompt,
      finalPrompt: prompt,
      referenceImageIds: [],
    },
  });

  try {
    const origin =
      process.env.APP_URL?.trim() ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()?.replace(/^/, "https://") ||
      new URL(request.url).origin;

    const webhookUrl = new URL(
      `/api/webhooks/fal?generationId=${generation.id}&kind=master-candidates`,
      origin
    ).toString();

    const job = await submitMasterCandidates(prompt, webhookUrl);

    await db.generation.update({
      where: { id: generation.id },
      data: { status: "PROCESSING", providerRequestId: job.requestId },
    });

    return NextResponse.json(
      { generationId: generation.id, requestId: job.requestId },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider error";
    console.error("Master candidate submission failed:", error);

    await db.generation.update({
      where: { id: generation.id },
      data: { status: "FAILED", errorMessage: message },
    });

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
