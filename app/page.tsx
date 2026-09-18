const modules = [
  ["Create Persona", "Definisci identità, aspetto e stile del personaggio."],
  ["Identity Lock", "Mantieni coerenti volto, corpo e tratti approvati."],
  ["Photoshoot", "Genera scene e fotografie mantenendo l'identità."],
  ["Video Studio", "Anima una generazione approvata con pipeline asincrona."]
];

export default function Home() {
  return (
    <main>
      <header>
        <div><span className="eyebrow">MVP 0.1</span><h1>AI Persona Studio</h1></div>
        <button>+ Create Persona</button>
      </header>
      <section className="hero">
        <p className="eyebrow">SYNTHETIC CHARACTER PLATFORM</p>
        <h2>Una persona AI coerente.<br/>Da una foto a un intero mondo.</h2>
        <p>Crea personaggi sintetici adulti, costruisci il Reference Pack e genera contenuti mantenendo l'identità.</p>
      </section>
      <section className="grid">
        {modules.map(([title,copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p><span>Apri →</span></article>)}
      </section>
    </main>
  );
}
