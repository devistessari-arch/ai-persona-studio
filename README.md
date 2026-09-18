# AI Persona Studio

MVP per creare e mantenere personaggi AI sintetici adulti con identità visiva persistente, photoshoot e pipeline video.

## MVP 0.1
- Persona CRUD e Identity Profile
- Reference Pack approvato
- Identity Lock
- Photoshoot asincrono
- Generation library
- Provider abstraction per immagini/video
- fal.ai server-side only

## Stack
Next.js App Router + TypeScript, Prisma/PostgreSQL, Redis/BullMQ, storage S3-compatible, fal.ai.

## Avvio
1. Copia `.env.example` in `.env`.
2. Avvia PostgreSQL e Redis: `docker compose up -d`.
3. `pnpm install`
4. `pnpm db:generate`
5. `pnpm db:push`
6. `pnpm dev`

> Non inserire chiavi API nel browser o nel repository. Le integrazioni AI sono solo server-side.

## Sicurezza prodotto
Il prodotto nasce per personaggi sintetici adulti. Riferimenti a persone reali richiedono diritti/consenso e non devono essere presentati ingannevolmente come contenuti reali.
