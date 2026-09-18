import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const selected = await db.referenceImage.findUnique({ where: { id } });
  if (!selected || selected.type !== "MASTER") return NextResponse.json({ error: "Master candidate not found" }, { status: 404 });

  await db.$transaction([
    db.referenceImage.updateMany({ where: { personaId: selected.personaId, type: "MASTER" }, data: { review: "REJECTED" } }),
    db.referenceImage.update({ where: { id }, data: { review: "APPROVED" } })
  ]);

  return NextResponse.json({ ok: true, masterId: id });
}
