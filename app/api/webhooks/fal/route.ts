import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ReferenceType } from "@prisma/client";
import { submitBodyComposite } from "@/lib/ai/providers/fal-body";

type FalImage = { url?: string };
type FalPayload = {
  images?: FalImage[];
  data?: { images?: FalImage[]; seed?: number };
  payload?: { images?: FalImage[]; seed?: number };
  seed?: number;
  error?: string | { message?: string };
  status?: string;
};

function errorMessage(error: FalPayload["error"]) {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  return error.message ?? "fal.ai returned an error";
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const generationId = url.searchParams.get("generationId");
  const kind = url.searchParams.get("kind");
  const referenceType = url.searchParams.get("referenceType");

  if (!generationId) {
    return NextResponse.json({ error: "Missing generationId" }, { status: 400 });
  }

  const payload = (await request.json()) as FalPayload;
  const images =
    payload.images ??
    payload.data?.images ??
    payload.payload?.images ??
    [];
  const seed = payload.seed ?? payload.data?.seed ?? payload.payload?.seed;
  const providerError = errorMessage(payload.error);

  console.log("fal webhook", {
    generationId,
    kind,
    status: payload.status,
    imageCount: images.length,
    hasError: Boolean(providerError),
    keys: Object.keys(payload),
  });

  if (providerError || images.length === 0) {
    await db.generation.update({
      where: { id: generationId },
      data: {
        status: "FAILED",
        errorMessage: providerError ?? "fal.ai webhook returned no images",
      },
    });
    return NextResponse.json({ ok: true });
  }

  const generation = await db.generation.update({
    where: { id: generationId },
    data: {
      status: "COMPLETED",
      outputUrl: images[0]?.url,
      seed: seed?.toString(),
      errorMessage: null,
    },
  });

  if (kind === "reference-pack" && referenceType && images[0]?.url) {
    await db.referenceImage.create({
      data: {
        personaId: generation.personaId,
        type: referenceType as ReferenceType,
        url: images[0].url,
        review: "PENDING",
        provider: generation.provider,
        model: generation.model,
        prompt: generation.finalPrompt,
      },
    });
  }

  if (kind === "body-blueprint" && images[0]?.url) {
    const faceMasterId = url.searchParams.get("faceMasterId");
    const face = faceMasterId ? await db.referenceImage.findUnique({ where: { id: faceMasterId } }) : null;
    if (!face?.url) {
      await db.generation.update({ where: { id: generationId }, data: { status: "FAILED", errorMessage: "Face Master unavailable for body composite" } });
      return NextResponse.json({ ok: true });
    }
    const compositePrompt = [
      "Create ONE ultra-photorealistic full-body photograph using the TWO supplied references with strict role separation.",
      "IMAGE 1 is the canonical FACE IDENTITY. Preserve its facial geometry, apparent age, complexion, eyes, hair identity and distinctive facial traits with maximum fidelity.",
      "IMAGE 2 is the canonical BODY BLUEPRINT. Preserve its full-body framing, pose, silhouette, skeletal proportions, shoulder width, torso length, waist, pelvis, hips, limbs and overall physique.",
      "Do not inherit the close-up framing from Image 1. The final composition MUST follow Image 2 and remain head-to-toe with both feet fully visible and floor below them.",
      "Integrate face and body naturally: coherent neck, skin tone, hair, perspective, lighting and anatomy. It must look like one genuine person photographed in one exposure, never a face swap, collage or pasted head.",
      "Maintain ordinary unretouched photographic realism: pores, subtle asymmetry, natural skin texture, realistic hands and joints, restrained sharpening and physically plausible light.",
      "No duplicated person, contact sheet, close-up, bust crop, CGI, illustration, glamour rendering, text or watermark."
    ].join("\n");
    const composite = await db.generation.create({ data: { personaId: generation.personaId, type: "IMAGE", provider: "fal.ai", model: "fal-ai/flux-2-pro/edit", prompt: compositePrompt, finalPrompt: compositePrompt, referenceImageIds: [face.id] } });
    const origin = process.env.APP_URL?.trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (!origin) throw new Error("APP_URL unavailable for body composite webhook");
    const base = origin.startsWith("http") ? origin : `https://${origin}`;
    const webhookUrl = new URL(`/api/webhooks/fal?generationId=${composite.id}&kind=body-candidates`, base).toString();
    try {
      const job = await submitBodyComposite({ prompt: compositePrompt, faceUrl: face.url, bodyUrl: images[0].url, webhookUrl });
      await db.generation.update({ where: { id: composite.id }, data: { status: "PROCESSING", providerRequestId: job.requestId, model: job.model } });
    } catch (error) {
      await db.generation.update({ where: { id: composite.id }, data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Body composite provider error" } });
    }
    return NextResponse.json({ ok: true });
  }

  if (kind === "body-candidates") {
    const rows = images.flatMap((image) => image.url ? [{ personaId: generation.personaId, type: "BODY_CANDIDATE" as const, url: image.url, review: "PENDING" as const, provider: generation.provider, model: generation.model, prompt: generation.finalPrompt }] : []);
    if (rows.length > 0) await db.referenceImage.createMany({ data: rows });
  }

  if (kind === "master-candidates") {
    const rows = images.flatMap((image) =>
      image.url
        ? [{
            personaId: generation.personaId,
            type: "MASTER" as const,
            url: image.url,
            review: "PENDING" as const,
            provider: generation.provider,
            model: generation.model,
            prompt: generation.finalPrompt,
          }]
        : []
    );

    if (rows.length > 0) {
      await db.referenceImage.createMany({ data: rows });
    }
  }

  return NextResponse.json({ ok: true });
}
