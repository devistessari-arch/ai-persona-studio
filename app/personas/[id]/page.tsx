import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import MasterStudio from "./master-studio";

export default async function PersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await db.persona.findUnique({ where: { id }, include: { references: { orderBy: { createdAt: "desc" } } } });
  if (!persona) notFound();
  return <main><a className="back" href="/">← Dashboard</a><section className="formHero"><p className="eyebrow">PERSONA</p><h1>{persona.name}</h1><p>{persona.description || "Identità sintetica pronta per il Master Portrait."}</p></section><MasterStudio personaId={persona.id} initialReferences={persona.references} /></main>;
}
