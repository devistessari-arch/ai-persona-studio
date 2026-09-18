import { fal } from "@fal-ai/client";
import type { ImageGenerationRequest, ImageProvider, ProviderJob } from "../types";

const MODEL = "fal-ai/flux-pro/kontext";

export class FalFluxKontextProvider implements ImageProvider {
  async submit(request: ImageGenerationRequest, webhookUrl: string): Promise<ProviderJob> {
    if (!process.env.FAL_KEY) throw new Error("FAL_KEY is not configured.");

    fal.config({ credentials: process.env.FAL_KEY });

    const { request_id } = await fal.queue.submit(MODEL, {
      input: {
        prompt: request.prompt,
        image_url: request.referenceUrls[0],
        aspect_ratio: request.aspectRatio
      },
      webhookUrl
    });

    return { requestId: String(request_id ?? ""), provider: "fal.ai", model: MODEL };
  }
}
