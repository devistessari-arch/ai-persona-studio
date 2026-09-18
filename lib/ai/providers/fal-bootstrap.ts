import { fal } from "@fal-ai/client";
const MODEL = "fal-ai/flux-2";
export async function submitMasterCandidates(prompt:string,webhookUrl:string){
 if(!process.env.FAL_KEY) throw new Error("FAL_KEY is not configured.");
 fal.config({credentials:process.env.FAL_KEY});
 const result=await fal.queue.submit(MODEL,{input:{prompt,image_size:"portrait_4_3",num_images:4,enable_prompt_expansion:true,enable_safety_checker:true,output_format:"jpeg"},webhookUrl});
 return {requestId:result.request_id ? String(result.request_id) : undefined,model:MODEL};
}