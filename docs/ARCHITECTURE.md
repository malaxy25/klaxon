# Spaceteam Web — Architektur

> Lebendes Dokument. Es wächst mit dem Projekt mit: Entscheidungen kommen in den
> Entscheidungslog unten, offene Punkte in die letzte Sektion.

**Status:** Planung abgeschlossen, MVP-Setup steht an
**Letzte Aktualisierung:** 2026-09-19

---

## 1. Ziel & Abgrenzung

Ein plattformunabhängiger Web-Klon von *Spaceteam* (Sleeping Beast Games): ein
kooperatives Party-Game, das mehrere Spieler gleichzeitig auf je eigenem Gerät
(Handy, Tablet, Laptop) spielen. Jeder sieht ein Cockpit voller absurd benannter
Bedienelemente. Die Befehle, die man selbst bekommt, betreffen oft Elemente auf
*fremden* Panels — also muss man sie laut zurufen. Chaos, bis das Schiff explodiert
oder in den nächsten Sektor springt.

**Ziele**

- Werktreuer Klon des Kern-Gameplays.
- Läuft im Browser auf jedem Gerät, **kein Download** — Seite öffnen, per Raumcode/QR
  beitreten, losspielen. Genau das ist der Vorteil gegenüber der App (Installations-
  und Kompatibilitätsärger, der beim Original real auftritt).
- **Gleicher Raum:** alle sitzen zusammen und rufen sich zu. Keine Fern-/Voice-Logik.
- Primär ein **Lernprojekt** („der Weg ist das Ziel"); evtl. später öffentlich mit
  optionalem Spenden-Button. So gebaut, dass es reifen *kann*.

**Bewusster Kompromiss:** Anders als das Original (lokal über Wi-Fi/Bluetooth,
offline) läuft unsere Version über einen Cloud-Server — im selben Raum braucht daher
**jedes Gerät Internet** (Mobilfunk/WLAN). In fast allen Fällen egal, nur bei
Party-Location ohne Empfang ein Nachteil.

**Nicht-Ziele (vorerst)**

- Keine Spracherkennung — das Zurufen machen die Menschen, das ist der Witz.
- Keine Fernspiel-/Voice-Integration (Design ist auf „gleicher Raum" ausgelegt).
- Keine Accounts, kein Login, keine Persistenz über eine Session hinaus.
- Kein natives App-Store-Release.

---

## 2. Leitprinzip

**Spiellogik strikt von Netzwerk und Host trennen.** Die gesamte Spiellogik lebt
als reine, seiteneffektfreie Funktionen im Paket `shared` — ohne jede Kenntnis von
WebSockets, Colyseus oder dem Browser. Der Server *orchestriert* nur, der Client
*rendert* nur.

Das ist die eine Entscheidung, die „reif werden können" erst ermöglicht:

- Spiellogik ist ohne Netzwerk unit-testbar.
- Host-Wechsel (Render → Fly.io → Colyseus Cloud) ohne Logik-Refactoring.
- Balancing-Parameter ändern, ohne Code umzubauen.

---

## 3. Tech-Stack

| Schicht | Wahl | Begründung |
|---|---|---|
| Sprache | TypeScript (überall) | Geteilte Typen zwischen Client & Server; Voraussetzung für Reife. |
| Server-Framework | Colyseus 0.18 | Räume, Matchmaking, delta-komprimierte State-Sync, Reconnect — genau das, was ein Party-Game braucht. MIT, frei selbst-hostbar. |
| Client-Framework | Svelte + Vite | Schlank, wenig Boilerplate, hervorragende Reaktivität und `transition`-System für Game-„Juice". |
| Client-Verpackung | PWA | Installierbar, Vollbild auf dem Handy. |
| Client-SDK | `@colyseus/sdk` | Offizieller JS/TS-Client (Colyseus 0.18). |
| Datenbank | keine | Spielräume sind flüchtig (im RAM). Spart Kosten und Komplexität. |
| Monorepo | npm workspaces | Eingebaut, kein Extra-Tool. Später auf pnpm umstellbar. |
| Server-Build (prod) | `tsc` → `node` | Offizieller Colyseus-Weg: nach `dist/` kompilieren, mit plain `node` starten (Decorators/Schema brauchen CommonJS). |
| Geteiltes Paket | kompiliertes CommonJS | `shared` wird zu `dist/` gebaut und als fertiges JS konsumiert — plain `tsc` bündelt keine Workspace-Quelle. |

---

## 4. Repo-Struktur

```
spaceteam/
├── package.json            # Monorepo-Wurzel (workspaces)
├── packages/
│   ├── shared/             # Reine Spiellogik — KEINE I/O
│   │   └── src/
│   │       ├── types.ts        # Control, Command, GameState, …
│   │       ├── technobabble.ts # Namensgenerator
│   │       ├── commands.ts     # Befehle erzeugen
│   │       ├── rules.ts        # erfüllt Control-Änderung einen Befehl?
│   │       └── difficulty.ts   # Sektor-/Kurven-Parameter
│   ├── server/             # Colyseus-Rooms, verdrahtet shared mit dem Netz
│   └── client/             # Svelte-PWA, rendert State, sendet Inputs
├── ARCHITECTURE.md
└── GETTING-STARTED.md
```

**Abhängigkeitsrichtung:** `shared` hängt von nichts ab. `server` und `client`
hängen von `shared` ab, aber nie voneinander.

---

## 5. Domänenmodell

- **GameRoom** — hält den State genau einer Session.
- **Player** — `id`, Name, `connected`, besitzt ein **Panel**.
- **Panel** — die Controls, die *dieser* Spieler auf seinem Bildschirm sieht und bedient.
- **Control** — `id`, Typ, aktueller Wert, Technobabble-Label, Besitzer-`playerId`.
  - Typen: `toggle` (an/aus), `slider` (Wertebereich), `selector` (mehrere Positionen), `button` (Taster).
- **Command** — `id`, Text, `targetControlId`, `targetValue`, `deadline`,
  `assignedToPlayerId` (wer den Befehl *sieht*), `status`.
- **Ship** — `hull` (gemeinsame Schadensleiste), `sector`, `commandsCompleted`.

---

## 6. Der Spielloop (serverseitig, autoritativ)

Der Server ist die einzige Wahrheitsquelle. Clients sind „dumm" und rendern nur
den State, den der Server synchronisiert.

1. Server erzeugt in Intervallen neue Befehle.
2. Jeder Befehl zielt auf ein Control, das auf irgendeinem Panel existiert.
3. Der Befehl wird einem Spieler zum **Anzeigen** zugeteilt — bewusst meist *nicht*
   dem Besitzer des Ziel-Controls. Daraus entsteht das Zurufen.
4. Spieler liest laut vor → Besitzer verstellt sein Control.
5. Client meldet die Änderung → Server prüft sie gegen *alle* aktiven Befehle.
6. Treffer → Befehl gilt als erfüllt, wird entfernt, ggf. neuer nachgeschoben.
7. Deadline abgelaufen oder falsche Aktion → Schaden auf `hull`.
8. Genug Erfüllungen → nächster **Sektor**: mehr Controls pro Panel, kürzere Timer,
   höhere Spawn-Rate.
9. `hull` = 0 → Game Over. Score = erreichte Sektoren.

---

## 7. Die harten Punkte

Das ist der eigentliche Anspruch des Projekts — der Rest ist in einem Nachmittag
gebaut. Alle drei gehören als testbare Funktionen in `shared/rules.ts`.

1. **Invariante Befehl↔Control:** Jeder aktive Befehl referenziert *immer* ein
   Control, das gerade auf einem verbundenen Panel existiert. Sonst entstehen
   unlösbare Befehle. Beim Erzeugen eines Befehls und bei jeder Panel-Änderung
   muss das garantiert sein.
2. **Disconnect / Reconnect:** Verlässt ein Spieler das Spiel, müssen seine
   Controls neu verteilt (oder entfernt) und alle auf ihn zeigenden Befehle neu
   ausgestellt werden. Colyseus' `allowReconnection()` überbrückt kurze
   Verbindungsabbrüche; die Control-Umverteilung ist eigene Logik.
3. **Race Condition bei Erfüllung:** Zwei Inputs treffen fast gleichzeitig ein.
   Der Server entscheidet atomar, welcher Befehl als erfüllt gilt. Weil alles
   durch den einen Node-Event-Loop läuft, ist das beherrschbar — man muss nur
   dran denken, den Befehl sofort als „erledigt" zu markieren, bevor der nächste
   Input verarbeitet wird.

---

## 8. Schwierigkeitsmodell (adaptiert von OpenSpaceTeam)

Kern ist ein **Tauziehen**: `health` (Start 50, max 100) gegen eine langsam
steigende **Todesgrenze** `deathLimit` (Start 0, max 90). Game Over, sobald
`health <= deathLimit`. Ein Level ist geschafft, wenn `health` 100 erreicht —
dann Reset (health 50, deathLimit 0) und härtere Werte.

Konfigurationsgetrieben in `shared/difficulty.ts`. Basiswerte:

- `instructionTimeMs` 25000 — Zeit pro Befehl
- `healthDrainPerSec` 0.5 — passiver Aderlass
- `deathLimitRisePerSec` 0.05 — Anstieg der Todesgrenze
- `completedHealthGain` 10 — Heilung pro erfülltem Befehl
- `expiredHealthLoss` 5 — Schaden pro abgelaufenem Befehl

Rampe pro Level (aus OpenSpaceTeam übernommen): Zeit −1250 ms (min 7000),
Drain +0.35 (max 1.25), Grenzanstieg +0.15 (max 1.25), Heilung −0.5 (min 3),
Strafe +0.25 (max 11.5). Panelgröße `min(6, 4 + ceil(level/4))` — bewusst **wenige, große** Kacheln (wie im Original); die Schwierigkeit kommt aus den Presets (Zeit/Aderlass), nicht aus mehr Kacheln. Die Lobby-Presets Casual/Normal/Hard/Insane setzen den **Start-Sektor** (1/3/5/8) — das Spiel springt tiefer in die Kurve; Default Normal.

Zielverteilung: ein Befehl zielt mit **1/6** auf ein Control im eigenen Panel,
sonst auf ein fremdes — daraus entsteht das Zurufen. Zielwert immer **≠ aktueller
Wert**; kein Control ist gleichzeitig Ziel zweier Befehle (Rejection-Sampling).

---

## 9. Netzwerk-Protokoll (Skizze)

Colyseus synchronisiert den **State** automatisch (Server → Clients). Zusätzlich
gibt es explizite **Messages**:

- **Client → Server**
  - `join` (Name) — über Matchmaking beim Raumbeitritt.
  - `setControl` (`controlId`, `value`) — Spieler hat ein Element verstellt.
  - `startGame` — nur Host, aus der Lobby heraus.
- **Server → Client** (via synchronisiertem State + gezielte Messages)
  - Voller `GameState`: Spieler, Panels, aktive Befehle, `hull`, `sector`.
  - `commandCompleted` / `damageTaken` / `gameOver` — für Effekte & Sound.

Lobby-Beitritt über **4-stelligen Raumcode** plus **QR-Code** (plattformübergreifend
am bequemsten).

---

## 10. Roadmap (Phasen)

- **Phase 0 — Lobby ✅ umgesetzt:** Host erstellt Raum → Raumcode + **QR-Beitritt**
  (der Kern von „kein Download"), Spielerliste, Ready, Host startet. QR wurde bewusst
  aus Phase 3 hierher vorgezogen, weil es der eigentliche Produktvorteil ist.
- **Phase 1 — Kernloop ✅ umgesetzt:** reine Engine in `shared` + Colyseus-Room +
  Svelte-Client (Panel mit 4 Control-Typen, Befehlstext, Health-vs-Todesgrenze-Leiste,
  Game Over / nächster Sektor). Netzwerkseitig getestet; **live auf Render** (Server
  als Docker Web Service, Client als Static Site) und mit echten Handys spielbar.
  Ergänzt: **Spielernamen** (localStorage, `setName`) und **„nochmal spielen"**
  (`playAgain` → `backToLobby`, Spieler bleiben im Raum).
- **Phase 2 — Inhalt & Gefühl (gestartet):** ✅ Sound (Web-Audio-Synth), Screenshake,
  „Sector N"-Banner, Mute-Toggle, **variables Panel-Layout** (Footprints `w`/`h`,
  dichtes Grid `grid-auto-flow: dense`), **Countdown-Balken pro Befehl**
  (Dauer aus `difficultyForLevel`), typ-eigene Control-Farben, **Cold-Start-Overlay**
  (Ladebalken + rotierende Sprüche) mit automatischem Verbindungs-Retry (~70 s),
  **In-App-Tutorial** (How-to-play-Overlay), **Schwierigkeits-Presets** (Host waehlt Start-Sektor). Offen:
  mehr Technobabble, Feinschliff der Kurve, echtes 4×4-Bin-Packing (statt CSS-dense).
- **Phase 3 — Reife (teils umgesetzt):** ✅ kaputte Panels (halten) + Alien-Schleim (wischen), ✅ 4-stelliger
  Raumcode (`filterBy`), ✅ reicherer Sound (Klaxon-Alarm). ✅ Spezial-Events (Meteor/Schwarzes
  Loch/Brace via DeviceMotion/Orientation + Tap-Fallback). ✅ PWA-Installation, ✅ Reconnect (allowReconnection), ✅ mehr Events (Surge/Freeze/Wormhole). ✅ 8 Spieler/Raum, Host-Kick, robustes Spielerentfernen (Game Over erst < 2). Offen: Observability, PNG-App-Icons, Feintuning.
- **Phase 3 — Reife (teils umgesetzt):** ✅ kaputte Panels (halten) + Alien-Schleim (wischen), ✅ 4-stelliger
  Raumcode (`filterBy`), ✅ reicherer Sound (Klaxon-Alarm). ✅ Spezial-Events (Meteor/Schwarzes
  Loch/Brace via DeviceMotion/Orientation + Tap-Fallback). ✅ PWA-Installation, ✅ Reconnect (allowReconnection), ✅ mehr Events (Surge/Freeze/Wormhole). ✅ 8 Spieler/Raum, Host-Kick, robustes Spielerentfernen (Game Over erst < 2). Offen: Observability, PNG-App-Icons, Feintuning.

---

## 11. Hosting & Betrieb

- **Jetzt:** Render Free (Docker-Web-Service). Keine DB nötig. Der Web-Service
  schläft nach 15 Min ein (~30–50 s Cold Start). Für Solo-Entwicklung egal.
  WebSockets/WSS laufen ohne Zusatzkonfiguration.
- **Keep-Warm (optional, gratis):** Cron-Ping alle ~10 Min hält den Service wach;
  passt knapp in die 750 Freistunden/Monat.
- **Später (Wachstum):** Fly.io — Pay-as-you-go, scale-to-zero, schnelleres
  Aufwachen, ~2 $/Monat im Leerlauf.
- **Bequem-Option:** Colyseus Cloud ab 15 $/Monat (managed, kein Free-Tier).

Weil der Server ein portables Docker-Image mit host-agnostischer Logik ist, ist
der Wechsel zwischen diesen Optionen ein Deploy-Ziel, kein Refactoring.

---

## 12. Entscheidungslog

| Datum | Entscheidung | Begründung |
|---|---|---|
| 2026-09-19 | Autoritativer Server + WebSockets statt P2P | Latenz unkritisch (Tempo = menschliche Reaktion); zentraler State ist robuster. |
| 2026-09-19 | Colyseus als Framework | Räume/Matchmaking/State-Sync/Reconnect out of the box. |
| 2026-09-19 | TypeScript überall | Geteilte Typen Client↔Server. |
| 2026-09-19 | Svelte fürs Client-UI | Schlank, ideal für Custom-Controls und Animationen. |
| 2026-09-19 | Keine Datenbank | Flüchtige Räume; spart Kosten & Komplexität. |
| 2026-09-19 | Render zuerst, Fly.io beim Wachsen | Gratis-Einstieg, klarer Migrationspfad. |
| 2026-09-19 | Server als CommonJS + `tsc`-Build; `shared` als kompiliertes CommonJS-Paket | Colyseus 0.18 verlangt `experimentalDecorators`/CommonJS für `@type`-Schemas; offizieller Prod-Weg ist `tsc` → `node dist/main.js`, nicht Bundler. |
| 2026-09-19 | Gesamte Spiellogik als reine `SpaceteamGame`-Engine in `shared`; Room ist nur Adapter | Testbar ohne Netzwerk (deterministischer PRNG); OpenSpaceTeam hatte die Logik an socket.io geklebt — wir trennen sie. |
| 2026-09-19 | Health-vs-Todesgrenze-Modell + 1/6-Zielverteilung + Werte-als-String | Von OpenSpaceTeam adaptiert (Konzept, eigener Code); im Sandbox-Test bestätigt. |
| 2026-09-19 | Disconnect im Spiel beendet die Runde (vorerst) | Pragmatisch wie OpenSpaceTeam; echtes Reconnect bleibt Phase 3. |
| 2026-09-20 | Scope fixiert: gleicher Raum, kein Download, Englisch, Lernprojekt (Spende später) | Klärung mit Nutzer; streicht Voice/Remote, vereinfacht alles. |
| 2026-09-20 | QR-Beitritt (roomId als Code) aus Phase 3 in Phase 0 vorgezogen | Ist der eigentliche Produktvorteil („Seite auf, scannen, los"). |
| 2026-09-20 | Svelte-5-Client mit reaktivem Store (`store.svelte.ts`) statt State-Framework | Schlank; Colyseus-State wird bei jedem Patch in `$state` gespiegelt. |

---

## 13. Offene Fragen

Geklärt: Spielerzahl 2–4; Disconnect beendet die Runde; Control-Verteilung per
1/6-Regel; Sprache Englisch; gleicher Raum, kein Voice.

Noch offen:

- **Raumcode-Ästhetik:** aktuell dient die Colyseus-`roomId` als Code (z. B.
  `iHA-GlHtV`) — funktioniert für QR/URL, ist aber zum Abtippen unschön. Später ein
  eigener 4-stelliger Code via Custom-Matchmaking.
- **Restart nach Game Over:** ✅ gelöst — „Play again" (nur Host) ruft `playAgain`
  → `backToLobby`; alle bleiben im Raum, Ready-Flags erhalten, Host startet neu.
  „Leave" lädt weiterhin neu.
- **Panel-Layout:** aktuell flaches 2–3-Spalten-Grid; das 4×4-Footprint-Packing
  (OpenSpaceTeam-Stil) ist ein optischer Phase-2-Punkt.
- **Eigener Twist / Name:** fürs Lernen egal; vor einer Veröffentlichung nötig
  (Markenname „Spaceteam" gehört Sleeping Beast Games).

---

## 14. Was wir von OpenSpaceTeam gelernt haben (Phase 1 umgesetzt)

Quelle: [github.com/openspaceteam](https://github.com/openspaceteam) (Vue-Frontend +
Python-Backend, AGPL-3.0, seit 2022 inaktiv). Wir haben nur die **Konzepte**
studiert und in eigenem TS-Code neu implementiert (AGPL-sauber).

Übernommene Design-Entscheidungen:

- **Tauziehen Health vs. Todesgrenze** statt simpler Lebensleiste (siehe §8).
- **Level = Health auf 100 füllen**, danach Reset + härtere Werte; konkrete
  Rampenzahlen übernommen.
- **1/6-Eigenanteil** bei der Zielwahl — im Test empirisch 0.163 gemessen.
- **Eindeutigkeits-Invariante** per Rejection-Sampling; **Zielwert ≠ aktuell**.
- **Ein aktiver Befehl pro Spieler** mit eigenem Countdown; erfüllt → sofort neuer
  (+Heilung), abgelaufen → Strafe + neuer.
- **Disconnect beendet die Runde** (bewusste Vereinfachung).

Besser gemacht: Ihre Logik klebte an socket.io. Bei uns liegt die gesamte Logik in
`shared` als reine `SpaceteamGame`-Engine; der Colyseus-`SpaceteamRoom` ist nur ein
dünner Adapter (Messages rein, Engine-State → Schema raus, `clock`-Tick).

Umgesetzte Dateien (in `packages/shared/src/`): `types.ts`, `rng.ts`,
`technobabble.ts`, `difficulty.ts`, `panel.ts`, `instructions.ts`, `engine.ts`.
Server: `packages/server/src/rooms/SpaceteamRoom.ts`, Registrierung in `main.ts`.

**Validierungsstand (in Node-22-Sandbox durchgespielt):**

- Deterministische Engine-Simulation (`packages/shared/test/sim.ts`): **25/25**
  Checks — Lobby/Host/Ready/Start, Invarianten, perfektes Team → Level-Up +
  härtere Schwierigkeit, Ablauf → Schaden + neuer Befehl, schlechtes Team → Game
  Over, Zielverteilung 0.163 ≈ 1/6.
- Zwei-Client-Netzwerktest gegen den echten Colyseus-Server: **8/8** — Lobby,
  State-Sync, Panels + Befehlstexte, 12 Befehle erfüllt, Level 1→3,
  Cross-Player-Befehle bestätigt.

Offen für Phase 2/3: Panel-Layout (4×4-Packing wie OpenSpaceTeam) und Client-UI,
Sound/„Juice", Spezial-Events (Asteroid/Schwarzes Loch, Modifier), echtes
Reconnect, Raumcode + QR-Beitritt.
