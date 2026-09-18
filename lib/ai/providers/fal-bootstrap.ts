import { fal } from "@fal-ai/client";

const MODEL = "fal-ai/flux-2";

function getFalCredentials() {
  const credentials =
    process.env.FAL_KEY_FAL_KEY?.trim() ||
    process.env.FAL_KEY?.trim();

  if (!credentials) {
    throw new Error(
      "fal.ai credentials missing: expected FAL_KEY_FAL_KEY or FAL_KEY."
    );
  }

  return credentials;
}

export async function submitMasterCandidates(
  prompt: string,
  webhookUrl: string
) {
  fal.config({ credentials: getFalCredentials() });

  const result = await fal.queue.submit(MODEL, {
    input: {
      prompt,
      image_size: "portrait_4_3",
      num_images: 4,
      enable_prompt_expansion: true,
      enable_safety_checker: true,
      output_format: "jpeg",
    },
    webhookUrl,
  });

  return {
    requestId: result.request_id ? String(result.request_id) : undefined,
    model: MODEL,
  };
}
