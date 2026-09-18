import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitSyntheticIdentityFromRealPhoto } from "@/lib/ai/providers/fal-bootstrap";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await db.persona.findUnique({
    where: { id },
    include: { identityProfile: true },
  });
  if (!persona?.identityProfile) return NextResponse.json({ error: "Persona non trovata." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("image");
  const rightsConfirmed = form.get("rightsConfirmed") === "true";

  if (!(file instanceof File)) return NextResponse.json({ error: "Seleziona una foto." }, { status: 400 });
  if (!rightsConfirmed) return NextResponse.json({ error: "Conferma di avere il diritto di utilizzare la foto." }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Formato non supportato. Usa JPG, PNG o WEBP." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "La foto supera 10 MB." }, { status: 400 });

  const traits = persona.identityProfile.immutableTraits as Record<string, unknown>;
  const prompt = [
    "Create a new, completely synthetic adult identity using the input photograph only as a source of photographic realism, pose, lighting and natural camera imperfections.",
    "IMPORTANT: do not preserve or recreate the source person's identity. The output must be recognizably a different person with materially different facial geometry.",
    `Target synthetic persona: apparent age ${persona.apparentAge}, gender presentation ${persona.genderPresentation}.`,
    `Canonical synthetic traits: ${JSON.stringify(traits)}.`,
    "Change the identity-defining geometry: eye shape and spacing, eyebrows, nose bridge and tip, lips, jawline, cheekbones, chin and facial proportions. Do not perform a face swap and do not create a lookalike.",
    "Preserve the realism of a genuine unretouched photograph: natural pores, mild freckles or pigmentation where appropriate, subtle asymmetry, peach fuzz, believable sclera, ordinary catchlights, baby hairs and flyaways.",
    "Young natural skin texture: visible pores and fine texture but avoid exaggerated wrinkles, deep forehead lines, heavy under-eye creases, aged or weathered skin.",
    "No beauty-filter plastic skin, CGI, illustration, HDR, glamour rendering or perfect symmetry. Natural color response, realistic lens behavior and physically plausible light.",
    "Generate four distinct candidate photographs of the same new synthetic identity, suitable for selecting a canonical Master Portrait.",
  ].join("\n");

  const generation = await db.generation.create({
    data: {
      personaId: id,
      type: "IMAGE",
      provider: "fal.ai",
      model: "fal-ai/flux-2/edit",
      prompt,
      finalPrompt: prompt,
      referenceImageIds: [],
    },
  });

  try {
    const origin =
      process.env.APP_URL?.trim() ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/^https?:\/\//, "")}`
        : new URL(request.url).origin);

    const webhookUrl = new URL(
      `/api/webhooks/fal?generationId=${generation.id}&kind=master-candidates`,
      origin
    ).toString();

    const job = await submitSyntheticIdentityFromRealPhoto(file, prompt, webhookUrl);

    await db.generation.update({
      where: { id: generation.id },
      data: { status: "PROCESSING", providerRequestId: job.requestId, model: job.model },
    });

    return NextResponse.json(
      { ok: true, generationId: generation.id, requestId: job.requestId },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider error";
    await db.generation.update({
      where: { id: generation.id },
      data: { status: "FAILED", errorMessage: message },
    });
    console.error("Synthetic identity generation failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
