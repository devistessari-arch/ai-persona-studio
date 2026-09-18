import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await db.persona.findUnique({ where: { id }, select: { id: true } });
  if (!persona) return NextResponse.json({ error: "Persona non trovata." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("image");
  const rightsConfirmed = form.get("rightsConfirmed") === "true";

  if (!(file instanceof File)) return NextResponse.json({ error: "Seleziona una foto." }, { status: 400 });
  if (!rightsConfirmed) return NextResponse.json({ error: "Conferma di avere il diritto di utilizzare la foto." }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Formato non supportato. Usa JPG, PNG o WEBP." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "La foto supera 10 MB." }, { status: 400 });

  // Intentionally do not persist the real-person source as a MASTER.
  // Phase 1 accepts the source only after rights confirmation; the next provider step
  // will transform it into a materially distinct synthetic identity before persistence.
  return NextResponse.json({
    ok: true,
    accepted: true,
    message: "Foto accettata. La trasformazione in identità sintetica sarà il passaggio successivo.",
  });
}
