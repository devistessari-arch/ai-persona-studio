"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PersonaCard({ persona }: { persona: { id: string; name: string; description: string | null; createdAt: string } }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const created = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(persona.createdAt));

  async function removePersona() {
    if (!confirm(`Eliminare definitivamente "${persona.name}"? Verranno eliminate anche immagini, riferimenti e generazioni associate.`)) return;
    setDeleting(true);
    const response = await fetch(`/api/personas/${persona.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error ?? "Impossibile eliminare la Persona.");
      return;
    }
    router.refresh();
  }

  return (
    <article style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h3>{persona.name}</h3>
          <p style={{ opacity: .65, fontSize: 13, marginTop: -6 }}>Creata il {created}</p>
        </div>
        <details style={{ position: "relative" }}>
          <summary aria-label="Menu Persona" title="Menu" style={{ cursor: "pointer", listStyle: "none", fontSize: 22, padding: "0 6px" }}>⋯</summary>
          <div style={{ position: "absolute", right: 0, zIndex: 10, minWidth: 150, padding: 8, border: "1px solid #333", borderRadius: 10, background: "#151515" }}>
            <button onClick={removePersona} disabled={deleting} style={{ width: "100%", cursor: "pointer", padding: "9px 10px", border: 0, borderRadius: 7, textAlign: "left" }}>
              {deleting ? "Eliminazione…" : "Elimina Persona"}
            </button>
          </div>
        </details>
      </div>
      <p>{persona.description?.slice(0, 180) || "Persona sintetica"}</p>
      <a href={`/personas/${persona.id}`}>Apri Persona →</a>
    </article>
  );
}
