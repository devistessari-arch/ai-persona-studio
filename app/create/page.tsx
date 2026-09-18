"use client";

import { FormEvent, useState } from "react";

type State = "idle" | "saving" | "done" | "error";

export default function CreatePersonaPage() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const response = await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, apparentAge: Number(payload.apparentAge), identityStrength: 90 })
    });

    if (!response.ok) {
      setState("error");
      setMessage("Controlla i campi e riprova.");
      return;
    }

    const persona = await response.json();
    setState("done");
    setMessage(`${persona.name} è stata creata. Apertura Master Studio...`);\n    window.location.href = `/personas/${persona.id}`;
  }

  return (
    <main>
      <a className="back" href="/">← Dashboard</a>
      <section className="formHero">
        <p className="eyebrow">CREATE PERSONA</p>
        <h1>Costruiamo un'identità, non solo un'immagine.</h1>
        <p>Definisci i tratti canonici. Saranno la base dell'Identity Lock e del Reference Pack.</p>
      </section>
      <form className="personaForm" onSubmit={submit}>
        <label>Nome<input name="name" required placeholder="Es. Sofia Vale" /></label>
        <label>Età apparente<input name="apparentAge" required type="number" min="18" max="90" defaultValue="25" /></label>
        <label>Presentazione<input name="genderPresentation" required placeholder="Es. donna" /></label>
        <label className="wide">Descrizione<textarea name="description" placeholder="Personalità visiva, presenza, atmosfera..." /></label>
        <label>Volto<textarea name="faceDescription" placeholder="Forma del viso, naso, labbra, zigomi..." /></label>
        <label>Capelli<textarea name="hairDescription" placeholder="Colore, lunghezza, texture..." /></label>
        <label>Occhi<textarea name="eyeDescription" placeholder="Colore, forma, sguardo..." /></label>
        <label>Pelle<textarea name="skinDescription" placeholder="Carnagione, lentiggini, texture..." /></label>
        <label>Corpo<textarea name="bodyDescription" placeholder="Corporatura e proporzioni..." /></label>
        <label>Tratti distintivi<textarea name="distinctiveFeatures" placeholder="Elementi che devono restare coerenti..." /></label>
        <label className="wide">Stile predefinito<textarea name="defaultStyle" placeholder="Wardrobe, make-up, estetica..." /></label>
        <div className="wide formActions"><button disabled={state==="saving"}>{state==="saving" ? "Creazione..." : "Crea Persona"}</button><span className={state}>{message}</span></div>
      </form>
    </main>
  );
}
