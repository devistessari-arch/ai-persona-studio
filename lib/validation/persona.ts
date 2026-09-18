import { z } from "zod";

export const createPersonaSchema = z.object({
  userId: z.string().min(1).default("local-user"),
  name: z.string().min(2).max(80),
  description: z.string().max(5000).optional(),
  apparentAge: z.number().int().min(18).max(90),
  genderPresentation: z.string().min(2).max(80),
  faceDescription: z.string().max(5000).optional(),
  bodyDescription: z.string().max(5000).optional(),
  hairDescription: z.string().max(5000).optional(),
  eyeDescription: z.string().max(5000).optional(),
  skinDescription: z.string().max(5000).optional(),
  distinctiveFeatures: z.string().max(5000).optional(),
  defaultStyle: z.string().max(5000).optional(),
  identityStrength: z.number().int().min(0).max(100).default(85)
});
