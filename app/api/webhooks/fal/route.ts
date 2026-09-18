import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ReferenceType } from "@prisma/client";

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
