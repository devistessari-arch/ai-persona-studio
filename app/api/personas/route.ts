import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPersonaSchema } from "@/lib/validation/persona";

export async function GET() {
  const personas = await db.persona.findMany({
    include: { identityProfile: true, references: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(personas);
}

export async function POST(request: Request) {
  try {
    const parsed = createPersonaSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const persona = await db.persona.create({
      data: {
        ...data,
        isSynthetic: true,
        identityProfile: {
          create: {
            immutableTraits: {
              face: data.faceDescription ?? "",
              body: data.bodyDescription ?? "",
              hair: data.hairDescription ?? "",
              eyes: data.eyeDescription ?? "",
              skin: data.skinDescription ?? "",
              distinctiveFeatures: data.distinctiveFeatures ?? ""
            },
            variableTraits: { wardrobe: data.defaultStyle ?? "" }
          }
        }
      },
      include: { identityProfile: true }
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    console.error("Persona creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
