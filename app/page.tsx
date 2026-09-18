import { db } from "@/lib/db";
import { PersonaCard } from "./persona-card";

const modules = [
  ["Create Persona", "Definisci identità, aspetto e stile del personaggio.", "/create"],
  ["Identity Lock", "Mantieni coerenti volto, corpo e tratti approvati.", "#"],
  ["Photoshoot", "Genera scene e fotografie mantenendo l'identità.", "#"],
  ["Video Studio", "Anima una generazione approvata con pipeline asincrona.", "#"]
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const personas = await db.persona.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, createdAt: true }
  });

  return (
    <main>
      <header>
        <div><span className="eyebrow">MVP 0.1</span><h1>AI Persona Studio</h1></div>
        <a className="primaryButton" href="/create">+ Create Persona</a>
      </header>
      <section className="hero">
        <p className="eyebrow">SYNTHETIC CHARACTER PLATFORM</p>
        <h2>Una persona AI coerente.<br/>Da una foto a un intero mondo.</h2>
        <p>Crea personaggi sintetici adulti, costruisci il Reference Pack e genera contenuti mantenendo l'identità.</p>
      </section>

      {personas.length > 0 && (
        <section style={{ marginBottom: "48px" }}>
          <p className="eyebrow">LE MIE PERSONAS</p>
          <div className="grid">
            {personas.map((persona) => (
              <PersonaCard key={persona.id} persona={{...persona, createdAt: persona.createdAt.toISOString()}} />
            ))}
          </div>
        </section>
      )}

      <section className="grid">
        {modules.map(([title,copy,href]) => <a className="cardLink" href={href} key={title}><article><h3>{title}</h3><p>{copy}</p><span>Apri →</span></article></a>)}
      </section>
    </main>
  );
}
