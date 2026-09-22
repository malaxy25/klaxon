# Spaceteam Web — Deploy auf Render + Smartphone-Test

Ziel: Server und Client oeffentlich auf Render (Free), damit echte Handys im selben
Raum nur eine `https://`-URL oeffnen und per QR beitreten - kein WLAN-/IP-/Firewall-
Gefummel.

> Verifiziert in der Sandbox: dass Vite `VITE_SERVER_URL` aus der Prozess-Umgebung
> zur Build-Zeit einbackt (Render-Env-Feld reicht), und der korrekte Build-Command.
> Die Render-Dashboard-Schritte koennen im Detail leicht abweichen.

## Voraussetzungen

- Projekt ist als GitHub-Repo gepusht (siehe unten).
- **`package-lock.json` ist committed** - der Docker-Build nutzt `npm ci` und braucht
  den Lockfile passend zu allen Workspaces.
- `Dockerfile` und `.dockerignore` liegen im Repo-Root und sind committed.

Kurzer Sanity-Check lokal, dass der Prod-Weg baut (spiegelt den Docker-Build):
```bash
npm ci
npm run build:shared && npm run build:server
npm run start -w @spaceteam/server   # "lauscht auf ..."? dann Ctrl-C
```

---

## Teil 1 - Server (Docker Web Service)

1. [dashboard.render.com](https://dashboard.render.com) -> **New** -> **Web Service**.
2. GitHub-Repo verbinden und auswaehlen.
3. Einstellungen:
   - **Language / Runtime:** Docker (Render erkennt das Root-`Dockerfile`).
   - **Instance Type:** **Free**.
   - **Region:** eine nahe Europa (z. B. Frankfurt).
4. **Create Web Service** -> Render baut das Image (dauert beim ersten Mal ein paar
   Minuten) und deployt.
5. Du bekommst eine URL wie `https://klaxon-server.onrender.com`. **Notiere sie.**

> ⚠️ **Namen sind global.** Ist dein Wunschname (z. B. `klaxon`) auf Render schon
> vergeben, haengt Render ein Zufallssuffix an (`klaxon-w8xo.onrender.com`) - **das**
> ist deine echte URL. Die saubere `klaxon.onrender.com` gehoert dann jemand anderem;
> gehst du versehentlich dorthin, siehst du eine fremde Seite (oder deren
> "waking up"-Bildschirm), nicht deine. Immer die im Dashboard **auf der Seite des
> Dienstes** angezeigte URL verwenden. Ein Umbenennen des Dienstes aendert die URL
> **nicht** - sie wird beim Erstellen fixiert.

**Test:** URL im Browser oeffnen. Erwartung: eine leere/Status-Antwort von Colyseus,
**kein** Fehler. Beim ersten Aufruf nach Leerlauf ~30-50 s Cold Start (Free-Tier
schlaeft nach 15 min ein) - das ist normal.

---

## Teil 2 - Client (Static Site)

1. Render -> **New** -> **Static Site** -> dasselbe Repo.
2. Einstellungen:
   - **Build Command:**
     ```
     npm install --include=dev && npm run build:shared && npm run build -w @spaceteam/client
     ```
     (`--include=dev` erzwingt die Build-Tools vite/svelte/typescript, falls Render
     `NODE_ENV=production` setzt; `build:shared` ist Vorsichts-Massnahme.)
   - **Publish Directory:** `packages/client/dist`
3. **Environment Variable** hinzufuegen (das ist der entscheidende Punkt):
   - Key: `VITE_SERVER_URL`
   - Value: `wss://klaxon-server.onrender.com`  ← die Server-URL aus Teil 1,
     **`wss://`** (nicht `ws://`), **ohne** Port.
   Vite backt diesen Wert zur Build-Zeit fest in den Client ein (verifiziert).
4. **Create Static Site** -> Render baut und deployt.
5. Die **echte Client-URL** steht im Dashboard auf der Seite der Static Site (auch
   hier evtl. mit Suffix, z. B. `https://klaxon-2dnv.onrender.com`) - **das** ist die
   Spiel-URL fuer die Handys, nicht der Wunschname.

> Woran du die beiden Dienste unterscheidest: Der **Server** ist ein *Web Service*
> und zeigt beim Aufruf nach Leerlauf einen "waking up"-/Render-Bildschirm. Die
> **Static Site** kommt sofort vom CDN (kein "waking up") und zeigt direkt den
> Spaceteam-Startbildschirm. Siehst du ein "Service waking up", bist du auf einem
> Web Service (deinem Server oder einer fremden Seite) - nicht auf deiner Static Site.
5. Du bekommst eine URL wie `https://klaxon.onrender.com` - **das ist die Spiel-URL**,
   die du teilst.

> Aendert sich spaeter die Server-URL, musst du die Env-Variable anpassen und den
> Client **neu deployen** (der Wert ist in den Build eingebacken, nicht zur Laufzeit).

---

## Teil 3 - Smartphone-Test

1. **Server aufwecken (optional):** Der Client faengt den Cold Start inzwischen ab -
   beim ersten "Start a new game" erscheint ein Lade-Overlay mit Fortschrittsbalken
   und lustigen Spruechen, und ein automatischer Retry ueberbrueckt das Aufwachen
   (~30-50 s). Wer nicht warten will, oeffnet vorher einmal die Server-URL aus Teil 1
   im Browser (bis sie antwortet) - dann ist der Server warm und der Start ist sofort da.
2. **Host:** Oeffne die Client-URL (`https://klaxon.onrender.com`) auf einem Handy,
   tippe **Start a new game** -> Ready room mit Code + QR erscheint.
3. **Mitspieler:** QR mit der Handy-Kamera scannen -> der Browser oeffnet die Spiel-URL
   mit `?r=CODE` und tritt automatisch bei. (Alternativ Client-URL oeffnen und den
   Code eintippen.)
4. Alle **I am ready**, Host **Start game** -> los geht's.

Rahmenbedingungen: **2-4 Spieler**. Jedes Geraet braucht Internet (Mobilfunk oder
WLAN) - anders als das Original laeuft die Verbindung ueber den Cloud-Server, nicht
lokal.

---

## Free-Tier-Realitaet

- Der Server **schlaeft nach 15 min Leerlauf** und braucht ~30-50 s zum Aufwachen.
  Fuer einen Spieleabend: einmal aufwecken (Teil 3, Schritt 1), dann laeuft er.
- Optional wach halten (gratis): ein Cron-Ping (z. B. cron-job.org) alle ~10 min auf
  die Server-URL. Passt knapp in die 750 Render-Freistunden/Monat.
- Waechst es, ist Fly.io (schnelleres Aufwachen) oder ein bezahlter Render-Plan der
  naechste Schritt - ohne Code-Aenderung, nur anderes Deploy-Ziel.

---

## Troubleshooting

- **"provided room name spaceteam not defined":** Der Server laeuft mit altem Code
  (ohne `SpaceteamRoom`) oder ein falscher Server. Sicherstellen, dass der aktuelle
  Stand gepusht und der Server neu deployt ist.
- **Client verbindet nicht / "Connection failed":** `VITE_SERVER_URL` pruefen -
  `wss://`, korrekte Server-Subdomain, kein Port, kein Slash am Ende. Nach Aenderung
  Client neu deployen. Server wach? (Cold Start abwarten.)
- **Erster Klick dauert:** Cold Start des Servers - der Client zeigt dabei das
  Lade-Overlay und versucht es automatisch erneut (bis ~70 s). Wer's sofort will,
  weckt den Server vorher ueber seine URL auf.
- **Static-Site-Build schlaegt fehl (`vite: not found` o. ae.):** `--include=dev`
  fehlt im Build-Command.
- **Docker-Build bricht bei `npm ci`:** `package-lock.json` nicht committed oder
  veraltet -> lokal `npm install`, committen, erneut pushen.
- **Mixed-Content-Fehler im Handy-Browser:** Client ist `https`, Server muss `wss`
  sein (nicht `ws`). Render liefert `wss` automatisch auf der `https`-Domain.

## Feedback einsammeln

Am Game-Over-Screen gibt es ein Feedback-Feld. Tester tippen Text ein und schicken ihn
ab - **ohne Account, ohne deine Mail**. Der Server verarbeitet es je nach Setup so:

**0) Standard ohne Setup - Render-Logs (nicht persistent).**
Feedback erscheint in den Logs von `klaxon-backend` (Render-Dashboard -> Service
`klaxon-backend` -> Tab **Logs**, im Suchfeld `FEEDBACK` filtern). Achtung: Render-Free
haelt Logs nur kurz vor - fuer "live zuschauen" ok, nicht zum Nachschlagen.

Fuer etwas Dauerhaftes setz auf dem **Server** (`klaxon-backend` -> Environment) die
Variable **`FEEDBACK_WEBHOOK`** auf eine der folgenden URLs (danach deployt Render neu):

**1) ntfy.sh - schnellste Push-Loesung, kein Account.**
- Denk dir eine schwer zu erratende Topic-URL aus, z. B.
  `https://ntfy.sh/klaxon-feedback-x7k2`.
- `FEEDBACK_WEBHOOK` = diese URL.
- Installier die **ntfy**-App (iOS/Android) oder oeffne die URL im Browser und
  abonniere das Topic. Feedback kommt als Push. (Aufbewahrung ~1 Tag.)

**2) Google Sheet via Apps Script - dauerhaft, du besitzt es.**
Feedback landet fuer immer in einer Tabelle; Tester brauchen keinen Account, deine
Mail bleibt verborgen.
1. Neues **Google Sheet** anlegen.
2. **Erweiterungen -> Apps Script**, den Code einfuegen und speichern:
   ```javascript
   function doPost(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
     var body = e.postData ? e.postData.contents : "";
     var msg = body;
     try { var j = JSON.parse(body); msg = j.text || j.content || body; } catch (err) {}
     sheet.appendRow([new Date(), msg]);
     return ContentService.createTextOutput("ok");
   }
   ```
3. **Bereitstellen -> Neue Bereitstellung -> Typ: Web-App**. Ausfuehren als: *ich*;
   Zugriff: **Jeder**. Bereitstellen und autorisieren.
4. Die **Web-App-URL** kopieren (endet auf `/exec`) und als `FEEDBACK_WEBHOOK` setzen.

Jedes Feedback haengt dann eine Zeile (Zeitstempel + Text) an die Tabelle an.

> Die Webhook-URL ist ein Secret in den Render-Env-Variablen - sie steht nicht im Repo
> und wird niemandem angezeigt. Der Server sendet an `ntfy.sh` reinen Text, an alle
> anderen Ziele JSON (`content`/`text`) - passt fuer Discord, Slack und Apps Script.
