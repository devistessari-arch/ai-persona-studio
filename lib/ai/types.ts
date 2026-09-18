export type ImageGenerationRequest = {
  prompt: string;
  referenceUrls: string[];
  aspectRatio: "9:16" | "4:5" | "1:1" | "16:9";
  identityStrength: number;
};

export type ProviderJob = {
  requestId: string;
  provider: string;
  model: string;
};

export interface ImageProvider {
  submit(request: ImageGenerationRequest, webhookUrl: string): Promise<ProviderJob>;
}

export interface VideoProvider {
  submit(input: { imageUrl: string; prompt: string; durationSeconds: number }, webhookUrl: string): Promise<ProviderJob>;
}
