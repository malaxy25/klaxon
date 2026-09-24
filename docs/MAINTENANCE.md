# Klaxon — Wartung (Libraries, Node, Deploy aktuell halten)

Faustregel: **nicht staendig updaten, sondern bewusst 1-2x pro Jahr** - und **immer
lokal bauen + einmal durchspielen, bevor du pushst** (Render deployt sonst kaputten Code).

## Die goldene Regel
Nach JEDER Aenderung an Abhaengigkeiten oder Node:
```
npm run build:shared && npm run build:server && npm run build -w @spaceteam/client
```
Dann lokal starten (`npm run dev:server` + `npm run dev:client`) und mit `?debug`
(Events/Hazards/Solve) einmal durchtesten. Erst danach committen und pushen.

## Was ist veraltet? / Sicherheit
```
npm outdated        # zeigt aktuell / gewuenscht / neuste Version je Paket
npm audit           # bekannte Sicherheitsluecken
npm audit fix       # sichere Fixes automatisch
```

## Updaten
- **Sanft** (innerhalb erlaubter Ranges, empfohlen als Erstes):
  ```
  npm update
  ```
- **Grosse Spruenge** (neue Major-Version, z. B. Colyseus 0.18 -> 0.19, Svelte 5 -> 6,
  Vite 8 -> 9): **einzeln** und getestet, nie alles auf einmal:
  ```
  npm install colyseus@latest @colyseus/core@latest @colyseus/schema@latest @colyseus/sdk@latest
  # danach IMMER: bauen + durchspielen (goldene Regel)
  ```
  Bei Majors kann es Breaking Changes geben - vorher den CHANGELOG/Migrationsguide des
  Pakets lesen (oder eine KI mit dem Diff drueberschauen lassen). Colyseus und Svelte
  haben in der Vergangenheit API-Aenderungen gehabt (z. B. defineServer/Runes) - dort
  besonders vorsichtig.

## package-lock.json
- Muss **committet** sein. Render baut den Server mit `npm ci`, was exakt die Versionen
  aus dem Lock installiert -> gleiche Builds lokal wie in Produktion.
- Nach einem Update aendert sich das Lock automatisch (`npm install`/`update`) -> mit
  committen.

## Node-Version
- Der Server-Container nutzt die Node-Version aus dem **Dockerfile** (Repo-Root):
  ```
  FROM node:24-alpine
  ```
  Wenn ein Build ploetzlich streikt, ist die Node-Version der erste Verdacht. Zum
  Aendern nur diese Zeile anpassen (z. B. auf `node:26-alpine`) und lokal mit derselben
  Node-Version testen. Deine lokale Version pruefen: `node -v`.
- Vite/Svelte/Colyseus vertragen aktuelle LTS-Versionen; bei einem Sprung die erste
  Render-Deploy-Log-Ausgabe im Auge behalten.

## Aktuelle gepinnte Kernversionen (Stand dieses Release)
- colyseus 0.18.6, @colyseus/core 0.18.14, @colyseus/schema 5.0.33, @colyseus/sdk 0.18.2
- svelte 5.57.1, vite 8.3.0, typescript 5.9.3, qrcode 1.5.4
- Node im Container: 24 (alpine)

## Deploy & Verifikation
- Push auf `main` -> beide Render-Dienste deployen automatisch (Server aus Dockerfile,
  Client als Static Site). Details: `docs/DEPLOY.md`, Variablen: `docs/ENV.md`.
- **Nach dem Deploy pruefen:** Footer zeigt die neue Versionsnummer; Server-Logs im
  Render-Dashboard ohne Fehler; kurz eine Runde mit zwei Geraeten testen.
- **Cold Start:** Der Free-Tier-Server "schlaeft" nach Leerlauf ein; der erste Zugriff
  dauert ~30-60 s (Client zeigt ein Reconnect/Connecting-Overlay). Fuer eine Party den
  Server vorher einmal aufwecken (Server-URL im Browser oeffnen).

## Rollback (falls ein Deploy kaputt ist)
- Schnell: im Render-Dashboard beim Dienst "Rollback" auf ein frueheres Deploy.
- Sauber: den letzten Commit ruecknehmen und pushen:
  ```
  git revert HEAD
  git push
  ```
