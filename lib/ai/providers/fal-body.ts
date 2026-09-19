import { fal } from "@fal-ai/client";

const BLUEPRINT_MODEL = "fal-ai/flux-2";
const COMPOSITE_MODEL = "fal-ai/flux-2-pro/edit";

function configure() {
  const value = process.env.FAL_KEY_FAL_KEY?.trim() || process.env.FAL_KEY?.trim();
  if (!value) throw new Error("fal.ai credentials missing");
  fal.config({ credentials: value });
}

export async function submitBodyBlueprint(args:{prompt:string;webhookUrl:string}) {
  configure();
  const result = await fal.queue.submit(BLUEPRINT_MODEL, {
    input: {
      prompt: args.prompt,
      image_size: "portrait_16_9",
      num_images: 1,
      enable_safety_checker: true,
      output_format: "jpeg",
    },
    webhookUrl: args.webhookUrl,
  });
  return { requestId: result.request_id ? String(result.request_id) : undefined, model: BLUEPRINT_MODEL };
}

export async function submitBodyComposite(args:{prompt:string;faceUrl:string;bodyUrl:string;webhookUrl:string}) {
  configure();
  const result = await fal.queue.submit(COMPOSITE_MODEL, {
    input: {
      prompt: args.prompt,
      image_urls: [args.faceUrl, args.bodyUrl],
      image_size: "portrait_16_9",
      safety_tolerance: "2",
      enable_safety_checker: true,
      output_format: "jpeg",
    },
    webhookUrl: args.webhookUrl,
  });
  return { requestId: result.request_id ? String(result.request_id) : undefined, model: COMPOSITE_MODEL };
}
