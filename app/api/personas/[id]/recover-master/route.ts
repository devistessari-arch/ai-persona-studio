import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recoverMasterCandidateResult } from "@/lib/ai/providers/fal-bootstrap";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const generations = await db.generation.findMany({
    where: {
      personaId: id,
      type: "IMAGE",
      provider: "fal.ai",
      providerRequestId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!generations.length) {
    return NextResponse.json({ error: "Nessuna generazione fal recuperabile trovata." }, { status: 404 });
  }

  for (const generation of generations) {
    if (!generation.providerRequestId) continue;

    try {
      const result = await recoverMasterCandidateResult(generation.providerRequestId);
      const urls = result.images.flatMap((image) => image.url ? [image.url] : []);
      if (!urls.length) continue;

      const existing = await db.referenceImage.findMany({
        where: { personaId: id, type: "MASTER", url: { in: urls } },
        select: { url: true },
      });
      const existingUrls = new Set(existing.map((x) => x.url));
      const newUrls = urls.filter((url) => !existingUrls.has(url));

      if (newUrls.length) {
        await db.referenceImage.createMany({
          data: newUrls.map((url) => ({
            personaId: id,
            type: "MASTER" as const,
            url,
            review: "PENDING" as const,
            provider: generation.provider,
            model: generation.model,
            prompt: generation.finalPrompt,
          })),
        });
      }

      await db.generation.update({
        where: { id: generation.id },
        data: {
          status: "COMPLETED",
          outputUrl: urls[0],
          seed: result.seed?.toString() ?? generation.seed,
          errorMessage: null,
        },
      });

      return NextResponse.json({ ok: true, recovered: urls.length, added: newUrls.length });
    } catch (error) {
      console.error("fal recovery failed", {
        generationId: generation.id,
        requestId: generation.providerRequestId,
        error,
      });
    }
  }

  return NextResponse.json(
    { error: "fal.ai non ha restituito immagini per le generazioni salvate." },
    { status: 404 }
  );
}
