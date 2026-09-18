import { fal } from "@fal-ai/client";

const MODEL = "fal-ai/flux-2/edit";

function credentials() {
  const value = process.env.FAL_KEY_FAL_KEY?.trim() || process.env.FAL_KEY?.trim();
  if (!value) throw new Error("fal.ai credentials missing");
  return value;
}

export async function submitBodyCandidates(args:{prompt:string;masterUrl:string;webhookUrl:string}) {
  fal.config({ credentials: credentials() });
  const result = await fal.queue.submit(MODEL, {
    input: {
      prompt: args.prompt,
      image_urls: [args.masterUrl],
      num_images: 4,
      enable_prompt_expansion: true,
      enable_safety_checker: true,
      output_format: "jpeg",
    },
    webhookUrl: args.webhookUrl,
  });
  return { requestId: result.request_id ? String(result.request_id) : undefined, model: MODEL };
}
