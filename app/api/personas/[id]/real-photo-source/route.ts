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
    "Create four photographs of ONE new synthetic adult identity derived from the input photograph.",
    "PRIMARY GOAL: extreme photographic realism. The result must have the visual quality of an ordinary unretouched camera photograph, never CGI, digital art, a beauty render or an influencer filter.",
    "SOURCE FIDELITY: preserve as much as possible of the source photo's overall visual character: apparent age, face-shape family, general facial proportions, complexion, natural freckles, hair color and texture, eye-color family, expression, pose, camera angle, lighting and photographic imperfections.",
    "IDENTITY DIVERGENCE: do not copy the source person's exact identity. Make a small but meaningful combination of subtle changes across several identity-bearing features such as eye spacing or shape, nose geometry, lip geometry, jaw/chin and cheekbone proportions. Do not redesign every feature.",
    "The new face should remain visually related to the source while being a distinct synthetic person, not a face swap and not an exact lookalike.",
    `Target persona: apparent age ${persona.apparentAge}, gender presentation ${persona.genderPresentation}.`,
    `Canonical synthetic traits: ${JSON.stringify(traits)}.`,
    "SKIN: young natural skin, visible pores, fine texture, tiny tonal variation, subtle translucency and peach fuzz. Preserve believable imperfections without exaggerating wrinkles, forehead lines, nasolabial folds, crow's feet or under-eye creases. No waxy or airbrushed skin.",
    "EYES: physically plausible sclera with subtle tonal variation, ordinary catchlights and natural iris detail. No glowing or hyper-sharp fantasy irises.",
    "HAIR: realistic density, individual strands, imperfect hairline, baby hairs and flyaways. Never sculpted glossy CGI hair.",
    "CAMERA REALISM: natural dynamic range, restrained contrast and sharpening, believable depth of field, slight sensor grain, physically plausible shadows and natural color response. No HDR, cinematic grading or glamour lighting.",
    "CONSISTENCY: all four outputs must represent the same new synthetic identity with only natural photographic variation. Keep facial identity stable across all four.",
    "No text, watermark, illustration, 3D render or stylization.",
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
