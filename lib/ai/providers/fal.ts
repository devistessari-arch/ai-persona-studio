import { fal } from "@fal-ai/client";
import type { ImageGenerationRequest, ImageProvider, ProviderJob } from "../types";

const MODEL = "fal-ai/flux-pro/kontext";

export class FalFluxKontextProvider implements ImageProvider {
  async submit(request: ImageGenerationRequest, webhookUrl: string): Promise<ProviderJob> {
    if (!(process.env.FAL_KEY ?? process.env.FAL_KEY_FAL_KEY)) throw new Error("FAL_KEY is not configured.");

    fal.config({ credentials: (process.env.FAL_KEY ?? process.env.FAL_KEY_FAL_KEY) });

    const { request_id } = await fal.queue.submit(MODEL, {
      input: {
        prompt: request.prompt,
        image_url: request.referenceUrls[0],
        aspect_ratio: request.aspectRatio as "21:9" | "16:9" | "4:3" | "3:2" | "1:1" | "2:3" | "3:4" | "9:16" | "9:21"
      },
      webhookUrl
    });

    return { requestId: String(request_id ?? ""), provider: "fal.ai", model: MODEL };
  }
}
