import { z } from "zod";

export const createPersonaSchema = z.object({
  userId: z.string().min(1).default("local-user"),
  name: z.string().min(2).max(80),
  description: z.string().max(1200).optional(),
  apparentAge: z.number().int().min(18).max(90),
  genderPresentation: z.string().min(2).max(80),
  faceDescription: z.string().max(1000).optional(),
  bodyDescription: z.string().max(1000).optional(),
  hairDescription: z.string().max(600).optional(),
  eyeDescription: z.string().max(400).optional(),
  skinDescription: z.string().max(600).optional(),
  distinctiveFeatures: z.string().max(1000).optional(),
  defaultStyle: z.string().max(600).optional(),
  identityStrength: z.number().int().min(0).max(100).default(85)
});
