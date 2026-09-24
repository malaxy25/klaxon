# Klaxon — Kontext fuer eine (neue) KI

Diese Datei bringt eine KI (oder dich) in einem halben Jahr schnell auf Stand, ohne
alles aus dem Code zu rekonstruieren. Kurz halten, bei groesseren Aenderungen anpassen.

## Was ist Klaxon
Ein browserbasiertes, kooperatives Party-Spiel im Stil von "Spaceteam": alle im selben
Raum, jeder hat ein Panel mit Bedienelementen, man ruft sich Befehle zu und fuehrt sie
unter Zeitdruck aus. Eigenstaendiger Klon, kein Original-Code.
- Repo: https://github.com/malaxy25/klaxon
- Live-Client: https://klaxon-2dnv.onrender.com  (Static Site)
- Server: https://klaxon-w8xo.onrender.com      (Docker Web Service, Frankfurt)

## Architektur (TypeScript-Monorepo, npm workspaces)
- `packages/shared/` - reine Spiel-Engine (keine I/O), deterministisch testbar
  (seedbarer PRNG). Hier lebt die gesamte Spiellogik: Panels, Befehle, Schwierigkeit,
  Hazards (kaputt/Schleim), Spezial-Events, Health/Todeslinie.
- `packages/server/` - Colyseus-Room als duenner Adapter um die Engine. Synchronisiert
  State an die Clients, nimmt Messages entgegen (setControl, ready, start, clearHazard,
  eventAction, kick, debug:* ...). Build via `tsc` -> `node dist/`.
- `packages/client/` - Svelte 5 + Vite, mobile-first PWA. Reaktiver Store
  (`store.svelte.ts`) haelt Zustand + Colyseus-Verbindung + Web-Audio.

## Tech-Stack (gepinnt via package-lock.json)
Colyseus 0.18 (core 0.18.x, schema 5.x, sdk 0.18.x), Svelte 5, Vite 8, TypeScript 5,
qrcode. Node im Container: siehe Dockerfile (`FROM node:24-alpine`). Genaue Versionen
und Update-Anleitung: `docs/MAINTENANCE.md`.

## Lokal starten / bauen / testen
```
npm install
npm run dev:shared      # Engine im Watch-Modus
npm run dev:server      # Colyseus lokal (Port 2567)
npm run dev:client      # Vite Dev-Server
# Build:
npm run build:shared && npm run build:server && npm run build -w @spaceteam/client
```
Tests: Die Engine ist deterministisch (seedbar) und wird mit kleinen `tsx`-Skripten
simuliert; Netzwerk/Room-Verhalten mit einem @colyseus/sdk-Harness gegen einen lokal
gestarteten Server. (Keine feste Test-Suite im Repo - Skripte werden ad hoc geschrieben.)

## Konventionen (WICHTIG)
- **Windows/PowerShell:** Dateien BOM-frei und in ASCII schreiben, sonst Build-/Runtime-
  Fehler. Projektordner NICHT in OneDrive.
- **Release-Workflow:** Aenderungen kommen als ZIP; anwenden mit
  `Expand-Archive -Force` ins Repo, dann `git add -A; git commit; git push`.
  (Tags optional: `git tag -a vX.Y.Z -m "..."; git push --follow-tags`.)
  Merke: `git push` schiebt den Branch - `git push --tags` allein tut das NICHT.
- **Versionierung:** Version an drei Stellen synchron halten: `package.json` (root),
  `VERSION` in `packages/client/src/lib/store.svelte.ts` (zeigt im Footer), und ein
  Eintrag in `CHANGELOG.md`.
- **Debug:** Spiel mit `?debug` oeffnen ODER im Home-Footer die Version 5x tippen ->
  Host-Debug-Panel (Events ausloesen, Hazards, Health/Sektor, Solve, Pause, Sounds,
  Server-Stats). Env `FORCE_EVENT=<typ>` erzwingt serverseitig einen Event-Typ.

## Deployment - was dazugehoert
Zwei getrennte Render-Dienste, beide deployen automatisch bei `git push` auf `main`:

1. **Server `klaxon-backend`** (Docker Web Service)
   - Baut aus dem `Dockerfile` (Repo-Root): node:24-alpine, `npm ci`, baut shared+server,
     startet `node packages/server/dist/main.js`, `EXPOSE 2567`.
   - Env-Variablen (siehe `docs/ENV.md`): optional `FEEDBACK_WEBHOOK`,
     `FEEDBACK_WEBHOOK_2`; Debug `FORCE_EVENT` u. a. `PORT` setzt Render selbst.
2. **Client `klaxon` / (Suffix-URL)** (Static Site)
   - Build Command: `npm install --include=dev && npm run build:shared && npm run build -w @spaceteam/client`
   - Publish Directory: `packages/client/dist`
   - Env: `VITE_SERVER_URL=wss://klaxon-w8xo.onrender.com` (Build-Zeit!)

Weitere Deploy-Details, Render-Eigenheiten (globale Namen -> Suffix-URLs, Cold Start,
`wss://` ohne Port) in `docs/DEPLOY.md`. Aktuell-halten: `docs/MAINTENANCE.md`.

## Weiterfuehrende Doku im Repo
- `README.md`, `CHANGELOG.md`, `BACKLOG.md`
- `docs/ARCHITECTURE.md`  - Design/Entscheidungen
- `docs/CLIENT.md`        - alle Client-Dateien im Volltext
- `docs/PHASE-1.md`       - Engine/Server-Kernschleife (Referenz)
- `docs/DEPLOY.md`        - Deployment Schritt fuer Schritt
- `docs/ENV.md`           - alle Umgebungsvariablen
- `docs/MAINTENANCE.md`   - Updates/Libraries/Node aktuell halten
- `docs/GETTING-STARTED.md` - Erststart (inkl. Windows-Eigenheiten)

## Einstiegs-Prompt fuer die naechste KI (zum Kopieren)
> Hier ist mein Projekt "Klaxon" (Repo/ZIP). Lies zuerst docs/AI-CONTEXT.md, README.md,
> docs/ARCHITECTURE.md, docs/CLIENT.md, docs/DEPLOY.md und CHANGELOG.md. Fasse dann in
> wenigen Saetzen die Architektur, den aktuellen Stand und die offenen Punkte (BACKLOG)
> zusammen und warte auf meine Aufgabe. Arbeitsweise: Aenderungen als anwendbares ZIP
> (ich mache Expand-Archive + git push), ASCII/BOM-frei, Version an den drei Stellen
> synchron halten, vor jedem Push lokal bauen und testen.
