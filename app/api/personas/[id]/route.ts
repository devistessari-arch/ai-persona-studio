import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const persona = await db.persona.findUnique({
    where: { id },
    include: { identityProfile: true, references: true, generations: { orderBy: { createdAt: "desc" } } }
  });
  if (!persona) return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  return NextResponse.json(persona);
}
