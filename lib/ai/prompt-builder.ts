export type PersonaPromptInput = {
  immutableTraits: Record<string, unknown>;
  userRequest: string;
  preset?: string;
  camera?: string;
  identityStrength: number;
};

export function buildPersonaPrompt(input: PersonaPromptInput) {
  const identity = JSON.stringify(input.immutableTraits);
  return [
    "Create a photorealistic image of the same synthetic adult character described below.",
    `Canonical identity: ${identity}`,
    `Identity preservation strength: ${input.identityStrength}/100.`,
    input.preset ? `Scene preset: ${input.preset}.` : "",
    input.camera ? `Camera style: ${input.camera}.` : "",
    `User direction: ${input.userRequest}`,
    "Preserve facial geometry and distinctive identity traits. Natural skin texture, plausible anatomy, realistic lighting. Do not imitate or claim to depict a real person."
  ].filter(Boolean).join("\n");
}
