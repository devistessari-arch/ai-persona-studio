import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type FalPayload = {
  images?: Array<{ url?: string }>;
  data?: { images?: Array<{ url?: string }> };
  seed?: number;
  error?: string;
};

export async function POST(request: Request) {
  const url = new URL(request.url);
  const generationId = url.searchParams.get("generationId");
  const kind = url.searchParams.get("kind");
  if (!generationId) return NextResponse.json({ error: "Missing generationId" }, { status: 400 });

  const payload = await request.json() as FalPayload;
  const images = payload.images ?? payload.data?.images ?? [];

  if (payload.error || images.length === 0) {
    await db.generation.update({ where: { id: generationId }, data: { status: "FAILED", errorMessage: payload.error ?? "No output returned" } });
    return NextResponse.json({ ok: true });
  }

  const generation = await db.generation.update({
    where: { id: generationId },
    data: { status: "COMPLETED", outputUrl: images[0]?.url, seed: payload.seed?.toString() }
  });

  if (kind === "master-candidates") {
    await db.referenceImage.createMany({
      data: images.flatMap(image => image.url ? [{
        personaId: generation.personaId, type: "MASTER" as const, url: image.url,
        review: "PENDING" as const, provider: generation.provider, model: generation.model, prompt: generation.finalPrompt
      }] : [])
    });
  }

  return NextResponse.json({ ok: true });
}
