# Spaceteam Web — Getting Started

Präzise Schritt-für-Schritt-Anleitung vom leeren Ordner bis zum ersten Deploy auf
Render. In **Meilensteinen** (M0–M5); jeder endet mit etwas, das nachweislich läuft.

> ✅ **Verifiziert:** Diese Anleitung wurde einmal komplett real durchgespielt
> (Node 22.22, npm 10.9). Bestätigte Versionen: `colyseus@0.18.6`,
> `@colyseus/sdk@0.18.2`, `vite@8.3`, `svelte@5.57`. Getestet wurde bis zur echten
> Client↔Server-Verbindung inkl. State-Sync sowie der gesamte Prod-Build. Der
> Docker-**Build** selbst wurde nicht ausgeführt (kein Docker-Daemon in der
> Testumgebung), aber jeder Befehl, den das Dockerfile ausführt (`npm ci`,
> `build:shared`, `build:server`, `node dist/main.js`), wurde einzeln validiert.
>
> ✅ **Zusätzlich auf Windows 11 + VS Code + PowerShell durchgespielt** (Node 24,
> npm 11) bis zum spielbaren Stand. Alle dabei aufgetretenen Stolpersteine sind in
> **M0b — Windows & VS Code** unten festgehalten (Node-Installation ohne winget,
> Execution Policy, BOM-Problem, Projektordner-Wahl). Windows-Nutzer lesen M0b
> **vor** M1.

**Prinzip:** Für jede Datei steht der **vollständige Pfad** dabei und der
**komplette Inhalt** — so wie die Datei am Ende aussehen muss. Wo eine Datei von
einem Scaffold erzeugt und dann angepasst wird, steht dabei, *was* geändert wurde.

Alle Befehle laufen aus dem Projekt-Wurzelverzeichnis `spaceteam/`, außer es steht
`cd …` davor. **Paketreihenfolge:** `shared` → `server` → `client` — dadurch
gelingt jeder `npm install` sofort.

---

## M0 — Voraussetzungen

```bash
node -v    # v22.x oder neuer erwartet
npm -v
git --version
```

- **Node.js 22 LTS** (oder neuer). Falls nötig via [nodejs.org](https://nodejs.org) oder `nvm`.
- **Git**.
- **GitHub**-Account (für den Deploy in M5).
- **Render**-Account: [render.com](https://render.com) — kostenlos, keine Kreditkarte.
- Editor mit TypeScript-Unterstützung (z. B. VS Code).

---

## M0b — Windows & VS Code (aus einem echten Durchlauf)

Auf Windows funktioniert alles, aber ein paar Stolpersteine sind uns real begegnet.
Wer auf macOS/Linux ist, überspringt diese Sektion.

**1. Node.js richtig installieren — NICHT über winget.** `winget install OpenJS.NodeJS`
kann den Visual-Studio-Installer nachziehen, der hinter Firmen-Proxys an
`aka.ms`-Downloads scheitert (endlose `RequestCanceled`-Fehler). Nimm stattdessen den
**`.msi`-Installer von [nodejs.org](https://nodejs.org)** (LTS, 64-bit). Beim Schritt
**„Tools for Native Modules" das Häkchen NICHT setzen** — genau das löst den
VS-/Chocolatey-Download aus, den wir nicht brauchen.

**2. Nach der Installation VS Code komplett neu starten.** Ein laufendes Terminal
liest den PATH nur beim Start. Ein neuer Terminal-Tab reicht nicht — die ganze
Anwendung schließen und neu öffnen. Prüfen:
```powershell
node -v
npm -v
```
Zeigt `node` immer noch nichts, obwohl installiert (`Test-Path "C:\Program Files\nodejs\node.exe"` = `True`), lädt diese Zeile den PATH in der Sitzung nach:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

**3. PowerShell Execution Policy.** Schlägt `npm` mit `PSSecurityException`
(„... npm.ps1 kann nicht geladen werden, da die Ausführung von Skripts deaktiviert
ist") fehl, einmalig erlauben (kein Admin nötig):
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Mit `J` bestätigen. (Falls eine Firmen-Gruppenrichtlinie das blockiert: statt `npm`
einfach `npm.cmd` verwenden.)

**4. Projektordner NICHT in OneDrive/SharePoint.** Ein synchronisierter Firmen-Ordner
(z. B. `...\Tocco AG\... - Dokumente`) führt zu Datei-gesperrt-Fehlern (`EPERM`)
mitten im `npm install`, weil OneDrive die zehntausenden `node_modules`-Dateien
synchronisieren will. Leg das Projekt lokal an, z. B.:
```powershell
mkdir C:\dev
cd C:\dev
```

**5. Das BOM-Problem (wichtig!).** Windows PowerShell 5.1 schreibt mit
`Set-Content -Encoding utf8` ein unsichtbares BOM an den Dateianfang. `tsx`, JSON und
Vite stolpern darüber (`Error: Error parsing: ...package.json`), obwohl der Inhalt
per `Get-Content` korrekt aussieht. Lösung: eine BOM-freie Schreibfunktion **einmal
pro Terminal-Sitzung** definieren:
```powershell
function Write-NoBom($Path, $Text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  $full = Join-Path (Get-Location) $Path
  New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
  [System.IO.File]::WriteAllText($full, $Text, $enc)
}
```

**6. Datei-Blöcke übersetzen.** Diese Anleitung zeigt Dateien im macOS/Linux-Stil:
```
cat > pfad/zur/datei <<'EOF'
...inhalt...
EOF
```
Die **PowerShell-Entsprechung** (BOM-frei, mit `\` als Pfadtrenner):
```powershell
@'
...inhalt...
'@ | ForEach-Object { Write-NoBom "pfad\zur\datei" $_ }
```
Das schließende `'@` muss **ganz am Zeilenanfang** stehen. Der **einfach**
gequotete Here-String `@' ... '@` nimmt alles wörtlich — `$`, Backticks usw. bleiben
unangetastet (deshalb nicht `@" ... "@` nehmen).

**7. Sonderzeichen beim Einfügen.** Zeichen wie `—`, Umlaute oder `„ "` können beim
Einfügen in PowerShell verstümmeln (`—` wird zu `â€"`). In Kommentaren ist das
kosmetisch, in Strings unschön. Am robustesten: Datei-Inhalte in **reinem ASCII**
halten (Gedankenstrich → `-`, keine Umlaute in Code). JSON und Config unbedingt
ASCII.

**8. `.env`-Dateien anlegen.** Punkt-Dateien macht der Explorer zickig — leg sie im
Terminal an (mit `Write-NoBom` wie oben).

**9. Ein Befehl pro Zeile.** In PowerShell jeden Befehl einzeln ausführen und Enter
drücken; zwei Befehle versehentlich auf einer Zeile geben kuriose Fehler.

**Sonst gilt:** Umgebungsvariablen laufen im Projekt durchgängig über **cross-env**
(in npm-Skripten), es ist also **kein** OS-spezifisches `VAR=wert befehl` nötig.
Einmalig empfehlenswert: `git config --global core.autocrlf input`. Empfohlene
VS-Code-Extension: **Svelte for VS Code**.

## M1 — Monorepo-Wurzel

```bash
mkdir spaceteam && cd spaceteam
git init
mkdir -p packages
```

### Datei: `spaceteam/package.json`

```json
{
  "name": "spaceteam",
  "private": true,
  "version": "0.0.0",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:shared": "npm run dev -w @spaceteam/shared",
    "dev:server": "npm run dev -w @spaceteam/server",
    "dev:client": "npm run dev -w @spaceteam/client",
    "build:shared": "npm run build -w @spaceteam/shared",
    "build:server": "npm run build -w @spaceteam/server",
    "start:debug": "npm run start:debug -w @spaceteam/server"
  }
}
```

### Datei: `spaceteam/.gitignore`

```gitignore
node_modules/
dist/
build/
.env
.env.*
!.env.example
.DS_Store
*.log
.vite/
```

**Ergebnis M1:** Leeres Monorepo mit npm-workspaces.

---

## M2 — Paket `shared` (geteilte Logik & Typen)

Die host-agnostische Spiellogik. Sie wird zu `dist/` kompiliert und von Server und
Client als fertiges JavaScript konsumiert.

```bash
mkdir -p packages/shared/src
```

### Datei: `spaceteam/packages/shared/package.json`

```json
{
  "name": "@spaceteam/shared",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --preserveWatchOutput"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

### Datei: `spaceteam/packages/shared/tsconfig.json`

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "target": "ESNext",
    "module": "CommonJS",
    "moduleResolution": "node",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

### Datei: `spaceteam/packages/shared/src/index.ts`

```ts
// ---- Typen ----
export type ControlType = "toggle" | "slider" | "selector" | "button";

export interface Control {
  id: string;
  type: ControlType;
  label: string; // Technobabble, z. B. "Fluxcapacitor"
  value: string; // aktueller Wert (einheitlich als String)
  ownerId: string; // Spieler, dem das Control gehört
}

export interface Command {
  id: string;
  text: string; // "Set the Fluxcapacitor to 4"
  targetControlId: string;
  targetValue: string;
  assignedToPlayerId: string; // wer den Befehl SIEHT
  deadline: number; // Zeitstempel (ms)
}

// ---- Technobabble-Generator ----
const PREFIXES = ["Flux", "Techno", "Cryo", "Quantum", "Plasma", "Neutrino", "Hydro", "Astro"];
const NOUNS = ["capacitor", "beam", "matrix", "coupling", "injector", "manifold", "dampener", "array"];

export function randomTechnobabble(): string {
  const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return p + n;
}

// ---- Regel: erfüllt eine Control-Änderung einen Befehl? ----
export function commandSatisfiedBy(command: Command, control: Control): boolean {
  return (
    command.targetControlId === control.id &&
    String(control.value) === String(command.targetValue)
  );
}
```

Installieren (legt die Workspace-Verlinkung an) und einmal bauen:

```bash
npm install
npm run build:shared
```

**Test:** Es existiert `packages/shared/dist/index.js` und `dist/index.d.ts`.

```bash
ls packages/shared/dist
```

**Ergebnis M2:** `shared` ist gebaut und im Monorepo verlinkt. ✅

---

## M3 — Colyseus-Server (läuft lokal)

Colyseus 0.18 nutzt die `defineServer`/`defineRoom`-API — kein manuelles Express
nötig. CORS ist standardmäßig aktiv, der Client darf sich also direkt verbinden.

```bash
mkdir -p packages/server/src/rooms
```

### Datei: `spaceteam/packages/server/package.json`

```json
{
  "name": "@spaceteam/server",
  "version": "0.0.0",
  "private": true,
  "main": "dist/main.js",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "dev:single": "cross-env SINGLE_PLAYER=1 tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "start:debug": "cross-env DEBUG_TARGETS=1 node dist/main.js"
  },
  "dependencies": {
    "@spaceteam/shared": "*",
    "colyseus": "^0.18.0"
  },
  "devDependencies": {
    "cross-env": "^10.1.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

### Datei: `spaceteam/packages/server/tsconfig.json`

> Von Colyseus vorgeschriebene Konfiguration. `experimentalDecorators` und
> `useDefineForClassFields: false` sind für die `@type()`-Schema-Klassen zwingend.

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "target": "ESNext",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "allowJs": true,
    "strictNullChecks": false,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "useDefineForClassFields": false
  },
  "include": ["src"]
}
```

### Datei: `spaceteam/packages/server/src/rooms/MyState.ts`

Der synchronisierte Zustand des Raums (vorerst ein Platzhalter-Player):

```ts
import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
}

export class MyState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
```

### Datei: `spaceteam/packages/server/src/rooms/MyRoom.ts`

```ts
import { Room, Client } from "colyseus";
import { MyState, Player } from "./MyState";

export class MyRoom extends Room {
  state = new MyState();

  onJoin(client: Client) {
    console.log(client.sessionId, "ist beigetreten");
    this.state.players.set(client.sessionId, new Player());
  }

  onLeave(client: Client) {
    console.log(client.sessionId, "hat verlassen");
    this.state.players.delete(client.sessionId);
  }
}
```

### Datei: `spaceteam/packages/server/src/main.ts`

Einstiegspunkt: registriert den Raum `my_room`, nutzt einmal `shared` (beweist die
Verdrahtung server-seitig) und startet den Server.

```ts
import { defineServer, defineRoom } from "colyseus";
import { MyRoom } from "./rooms/MyRoom";
import { randomTechnobabble } from "@spaceteam/shared";

const port = parseInt(process.env.PORT, 10) || 2567;

const server = defineServer({
  rooms: {
    my_room: defineRoom(MyRoom),
  },
});

server.listen(port);
console.log(`Colyseus lauscht auf ws://localhost:${port} (shared: ${randomTechnobabble()})`);
```

Abhängigkeiten installieren und Server starten (aus der Wurzel):

```bash
npm install
npm run dev:server
```

**Test:** In der Konsole erscheint das Colyseus-Banner und
`Colyseus lauscht auf ws://localhost:2567 (shared: …)`. `tsx watch` startet bei
jeder Dateiänderung neu. (Zum Weitermachen laufen lassen oder mit Ctrl-C stoppen.)

**Ergebnis M3:** Ein laufender Colyseus-Server, der `shared` nutzt. ✅

---

## M4 — Svelte-Client (verbindet sich lokal)

Der Client wird mit Vite erzeugt und dann angepasst.

```bash
cd packages
npm create vite@latest client -- --template svelte-ts
cd ..
```

> ⚠️ **`create-vite` fragt evtl. „Install with npm and start now?"** (neuere
> Versionen). Wähle mit den Pfeiltasten **No** — sonst installiert Vite ein
> **client-lokales** `node_modules` samt eigenem Lockfile und startet gleich den
> Dev-Server (beides wollen wir im Monorepo nicht). Falls schon „Yes" passiert ist:
> den Dev-Server mit `Strg + C` stoppen und aufräumen —
> ```bash
> rm -rf packages/client/node_modules packages/client/package-lock.json
> ```
> (Windows-PowerShell: `Remove-Item -Recurse -Force packages\client\node_modules, packages\client\package-lock.json`).
> Danach kommt in Schritt 2 ohnehin das saubere Wurzel-`npm install`.

> Falls Vite (ohne den Prompt) nur einen eigenen Lockfile unter `packages/client/`
> erzeugt hat, entfernen — im Monorepo gibt es nur **einen** Lockfile in der Wurzel:
> ```bash
> rm -f packages/client/package-lock.json
> ```

**Schritt 1 — Namen setzen.** Öffne `packages/client/package.json` und ändere die
erste Zeile von `"name": "client"` auf `"name": "@spaceteam/client"`.

> ⚠️ **Wichtig — Reihenfolge (im Test verifizierte Falle):** Jetzt **zuerst** an der
> Wurzel `npm install` ausführen, **bevor** du Client-Abhängigkeiten mit `-w`
> hinzufügst. Grund: npm muss den soeben umbenannten Workspace `@spaceteam/client`
> erst registrieren. Lässt du diesen Schritt aus, meldet npm
> „no workspace folder present" und trägt die Pakete **nicht** ins Client-Manifest ein.

**Schritt 2 — Workspace registrieren:**

```bash
npm install
```

**Schritt 3 — Client-Abhängigkeiten hinzufügen:**

```bash
npm install -w @spaceteam/client @colyseus/sdk "@spaceteam/shared@*"
```

### Datei: `spaceteam/packages/client/package.json`

> Das meiste hiervon hat Vite erzeugt. **Geändert wurde:** das `"name"`-Feld
> (Schritt 1) und die beiden Einträge unter `dependencies` (Schritt 3).
> **Die devDependencies-Versionen setzt das Scaffold — deine können abweichen
> (Vite/Svelte aktualisieren häufig); das ist in Ordnung.** So sieht die im Test
> erzeugte Datei aus:

```json
{
  "name": "@spaceteam/client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^7.3.0",
    "@tsconfig/svelte": "^5.0.8",
    "@types/node": "^24.13.3",
    "svelte": "^5.57.0",
    "svelte-check": "^4.7.6",
    "typescript": "~6.0.2",
    "vite": "^8.3.0"
  },
  "dependencies": {
    "@colyseus/sdk": "^0.18.2",
    "@spaceteam/shared": "^0.0.0"
  }
}
```

### Datei: `spaceteam/packages/client/vite.config.ts`

> **Kompletter Ersatz** des vom Scaffold erzeugten Inhalts. Neu ist der Block
> `optimizeDeps` — er sorgt dafür, dass Vite das CommonJS-Paket `@spaceteam/shared`
> sauber einbindet.

```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  optimizeDeps: {
    include: ["@spaceteam/shared"],
  },
});
```

### Datei: `spaceteam/packages/client/.env.development`

```
VITE_SERVER_URL=ws://localhost:2567
```

### Datei: `spaceteam/packages/client/src/App.svelte`

> **Kompletter Ersatz** des vom Scaffold erzeugten Inhalts.

```svelte
<script lang="ts">
  import { Client } from "@colyseus/sdk";
  import { onMount } from "svelte";
  import { randomTechnobabble } from "@spaceteam/shared";

  let status = "verbinde…";

  onMount(async () => {
    console.log("shared works:", randomTechnobabble());
    try {
      const url = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";
      const client = new Client(url);
      const room = await client.joinOrCreate("my_room");
      status = `verbunden! sessionId: ${room.sessionId}`;
      room.onStateChange((state) => console.log("state:", state));
    } catch (e) {
      status = `Fehler: ${(e as Error).message}`;
      console.error(e);
    }
  });
</script>

<main>
  <h1>Spaceteam</h1>
  <p>{status}</p>
</main>
```

Jetzt beides laufen lassen. Am bequemsten **drei Terminals** (so werden Änderungen
an `shared` sofort neu gebaut und übernommen):

```bash
# Terminal 1 — shared im Watch-Modus
npm run dev:shared
# Terminal 2 — Server
npm run dev:server
# Terminal 3 — Client
npm run dev:client
```

> Minimal-Variante ohne Terminal 1: einmal `npm run build:shared`; dann reichen
> Terminal 2 und 3. Nach jeder Änderung an `shared` erneut bauen.

**Test:** Vite zeigt eine URL (meist `http://localhost:5173`). Im Browser steht
„verbunden! sessionId: …", die Browser-Konsole zeigt `shared works: …`, und die
Server-Konsole meldet einen Beitritt.
*(Im Sandbox-Durchlauf bestätigt: Verbindung hergestellt, `sessionId`/`roomId`
erhalten, State synchronisiert mit `players.size: 1`, Server loggte Join/Leave.)*

**Ergebnis M4:** Client, Server und `shared` spielen lokal zusammen. ✅

---

## M5 — Deploy des Servers auf Render

Zuerst muss der **Server** öffentlich erreichbar sein. Der Client (statische Seite)
folgt später.

> 📄 Für den **vollständig geführten Deploy** (Server **und** Client als Static Site,
> plus Smartphone-Test und Troubleshooting) siehe **`DEPLOY.md`** — dort ist der
> verifizierte Weg inkl. der `VITE_SERVER_URL`-Env-Variable Schritt für Schritt.

### 5.1 — Dockerfile & .dockerignore

### Datei: `spaceteam/Dockerfile`

```dockerfile
FROM node:22-alpine
WORKDIR /app

# Manifeste zuerst → stabiler npm-Cache-Layer
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

# Alle Workspace-Abhängigkeiten installieren (inkl. devDeps für den Build)
RUN npm ci

# Restliche Quellen kopieren
COPY . .

# shared zuerst, dann Server bauen (beides via tsc)
RUN npm run build:shared && npm run build:server

ENV NODE_ENV=production
EXPOSE 2567
CMD ["node", "packages/server/dist/main.js"]
```

> Warum die client-package.json mitkopiert wird: `npm ci` erwartet die vollständige
> Workspace-Struktur passend zum Lockfile. Der Client-Quellcode wird nicht gebaut,
> nur der Server.

### Datei: `spaceteam/.dockerignore`

```
node_modules
**/node_modules
**/dist
**/build
.git
*.log
```

**Vor dem Deploy lokal validieren** (spiegelt exakt die Dockerfile-Befehle, im Test
so bestätigt):

```bash
npm ci
npm run build:shared && npm run build:server
npm run start -w @spaceteam/server   # muss "lauscht auf …" loggen; mit Ctrl-C stoppen
```

> `npm ci` löscht `node_modules` selbst und installiert exakt aus dem Lockfile — kein
> manuelles Löschen nötig (und damit kein `rm -rf`, das es auf Windows so nicht gibt).

Danach `npm install` erneut ausführen (stellt die lokalen dev-node_modules wieder her).

### 5.2 — Nach GitHub pushen

```bash
npm install          # sichert einen aktuellen package-lock.json
git add .
git commit -m "MVP-Gerüst: Monorepo, shared, Colyseus-Server, Svelte-Client, Docker"
```

Auf GitHub ein **leeres** Repository `spaceteam` anlegen (ohne README/Lizenz), dann:

```bash
git remote add origin https://github.com/<DEIN-USER>/spaceteam.git
git branch -M main
git push -u origin main
```

### 5.3 — Render-Web-Service erstellen (im Browser)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. GitHub-Repo `spaceteam` verbinden und auswählen.
3. Einstellungen:
   - **Language / Runtime:** Docker (Render erkennt das `Dockerfile` automatisch).
   - **Instance Type:** **Free**.
   - **Region:** eine nahe Europa (z. B. Frankfurt), falls angeboten.
4. **Create Web Service.** Render baut das Image und deployt.

Du erhältst eine URL wie `https://spaceteam-xyz.onrender.com`. WebSockets laufen
über dieselbe Adresse mit **`wss://`** — ohne Zusatzkonfiguration. Beim ersten
Aufruf nach einer Ruhephase ~30–50 s Cold Start (normal für den Free-Tier).

### 5.4 — Client auf den Prod-Server zeigen lassen

### Datei: `spaceteam/packages/client/.env.production`

> `spaceteam-xyz` durch deinen echten Render-Subdomain-Namen ersetzen.

```
VITE_SERVER_URL=wss://spaceteam-xyz.onrender.com
```

Prod-Build des Clients lokal testen:

```bash
npm run build -w @spaceteam/client
npm run preview -w @spaceteam/client
```

> **Client-Deploy** (eigener Schritt, später): als **Static Site** auf Render —
> Root-Verzeichnis `packages/client`, Build-Command
> `npm install && npm run build -w @spaceteam/client`,
> Publish-Verzeichnis `packages/client/dist`. Oder auf Vercel/Netlify.

---

## Danach: Phase 0 & 1 (bereits umgesetzt)

Das in M1–M5 aufgebaute Skelett ist das Fundament. Phase 0 (Lobby) und Phase 1
(Kernloop + Client-UI) sind bereits gebaut und getestet — die vollständigen Dateien
liegen in zwei Begleitdokumenten:

- **`PHASE-1.md`** — die reine Spiel-Engine in `shared` + der Colyseus-`SpaceteamRoom`.
- **`CLIENT.md`** — der Svelte-Client: Lobby mit Raumcode + QR-Beitritt und der
  Spielbildschirm (Panel, Befehlstext, Health-vs-Todesgrenze-Leiste, Game Over).

> Hinweis: Die minimale `App.svelte` aus **M4** ist nur ein Verbindungstest. Sie wird
> durch den echten Client aus `CLIENT.md` ersetzt (dort auch die zusätzliche
> Abhängigkeit `qrcode` und die neuen `src/lib/*`-Dateien).

---

## Häufige Stolpersteine

- **Client-Deps landen nicht im Manifest** („no workspace folder present"): Du hast
  Schritt 2 (root `npm install` nach dem Umbenennen) übersprungen. Erst
  `npm install`, dann `npm install -w @spaceteam/client …`.
- **`@spaceteam/shared` nicht gefunden:** Aus der **Wurzel** `npm install`, und
  sicherstellen, dass `packages/shared/dist` existiert (`npm run build:shared`).
  Ohne gebautes `dist` findet Server/Client das Paket zur Laufzeit nicht.
- **Änderungen an `shared` wirken nicht:** neu bauen — Watch (`npm run dev:shared`)
  oder einmalig (`npm run build:shared`).
- **Client-Konsole „does not provide an export named …" für `@spaceteam/shared`:**
  `optimizeDeps.include` in `vite.config.ts` fehlt, oder Vite-Cache ist alt → den
  Ordner `packages/client/node_modules/.vite` löschen (Linux/macOS:
  `rm -rf packages/client/node_modules/.vite`; Windows PowerShell:
  `Remove-Item -Recurse -Force packages/client/node_modules/.vite`) und Client neu starten.
- **`@colyseus/schema` nicht auflösbar:** kommt normalerweise transitiv über
  `colyseus` (im Test bestätigt). Falls doch nicht:
  `npm install -w @spaceteam/server @colyseus/schema`.
- **WebSocket verbindet in Prod nicht:** Client-URL muss `wss://` sein (nicht `ws://`)
  und **keinen** Port anhängen — Render terminiert TLS auf 443.
- **Docker-Build bricht bei `npm ci`:** `package-lock.json` muss eingecheckt und
  aktuell sein → in der Wurzel `npm install`, committen, erneut pushen.
- **Alpine-Image macht Probleme mit nativen Modulen:** auf `FROM node:22-slim`
  wechseln (glibc statt musl). Für das Standard-Setup nicht nötig.
- **Raumname stimmt nicht:** Server registriert `my_room`
  (`packages/server/src/main.ts`), Client ruft `joinOrCreate("my_room")` — beide
  müssen übereinstimmen.
