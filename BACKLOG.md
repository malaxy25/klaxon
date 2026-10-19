# Klaxon — Backlog (Known Issues & Improvements)

Offene Punkte aus Playtests und Ideen. Wir gehen sie **einzeln** an: pro Punkt steht
hier ein Loesungsplan; bevor gebaut wird, besprechen wir den Ansatz im Chat und
verfeinern ihn. Erledigtes steht in den [Releases](https://github.com/malaxy25/klaxon/releases).

Legende: **Prio** hoch/mittel/niedrig, **Aufwand** S/M/L.

---

## Gameplay

### G1 — Kaputte Panels / Reparatur   (Prio: hoch, Aufwand: M-L)
> ✅ **Erledigt in v0.7.0** (Halten ~1,5 s zum Reparieren). Plan bleibt als Referenz.

**Problem:** Im Original "brechen" unter Zeitdruck Bedienelemente (sie haengen /
blockieren) und muessen erst repariert werden. Erzeugt Hektik und Teamarbeit.

**Plan:**
- Engine: jedes Control bekommt `broken: boolean`. Ein Scheduler bricht in Intervallen
  (Rate steigt mit Sektor / bei niedriger Health) ein zufaelliges, gerade **nicht**
  anvisiertes Control.
- Ein kaputtes Control erfuellt keinen Befehl und wird nicht als Ziel gewaehlt, bis es
  repariert ist.
- Reparatur = klare Geste (Vorschlag: **gedrueckt halten ~1,5 s**). Client schickt
  `repairControl`, Server macht es wieder heil.
- Sync: `broken` ins ControlSchema; Client zeigt es vergraut / mit Funken + FIX-Overlay.

**Zu klaeren:** Reparatur-Geste (halten vs. mehrfach tippen)? Ausloeser (feste Rate vs.
Low-Health)? Optional Befehl "Fix the X" statt stiller Blockade?

### G2 — Spezial-Team-Events   (Prio: mittel, Aufwand: L)
> ✅ **Erledigt in v0.8.0** (Meteor/Shake, Black hole/Flip, Brace/Tap; PASS/FAIL akustisch + optisch + Vibration; Tap-Fallback). Plan bleibt als Referenz.

**Problem:** Gemeinsame "alle machen X"-Momente: Meteoritenschauer -> alle **schuetteln**;
schwarzes Loch -> alle **drehen** das Geraet; Wurmloch -> Panels tauschen; usw.

**Plan:**
- Engine: Event-Scheduler triggert ab Sektor X ein Event mit Dauer + Erfolgsbedingung
  (alle Spieler fuehren die Geste rechtzeitig aus).
- Gesten via **DeviceMotion** (Schuetteln) / **DeviceOrientation** (Drehen/Kippen).
  iOS verlangt eine **Erlaubnis per Tap** (`requestPermission`), also einmalig ein
  "Motion aktivieren"-Prompt. Fallback ohne Sensor/Erlaubnis: On-Screen-Button
  ("TAP TO BRACE").
- Sync: Server broadcastet `event:start {type, deadline}`; Client erkennt die Geste
  lokal -> `event:done`; alle rechtzeitig = Erfolg (Heilung/weiter), sonst Schaden.
- Client: Vollbild-Overlay mit Anweisung + Fortschritt.

**Zu klaeren:** Welches Event zuerst (Schuetteln = am einfachsten)? Wann den
Motion-Prompt zeigen? Wurmloch (Panel-Tausch) als rein serverseitiges Event ohne Sensoren?

### G3 — Training-Modus (gefuehrtes Tutorial)   (Prio: hoch, Aufwand: L)
> Geplant, Ansatz abgestimmt (2026-10-19). Kommt komplett in **einem** Release.

**Problem (Playtest-Feedback):** Die How-to-play-Anleitung reicht Neulingen nicht als
Einstieg. Man landet sofort in Timer, Pannen und Events. Gewuenscht: ein Trainingsraum
ohne Zeitdruck, der die Crew Schritt fuer Schritt durchfuehrt und dabei jede Panne und
jedes Event einmal spielen laesst.

**Entscheide:**
- Training ist ein **Modus im Raum der Crew** (Lobby-Option "Training" neben
  Casual/Normal/Hard/Insane), nicht solo - das Zurufen zwischen Geraeten ist der Kern.
- **Keine XP.** Belohnung ueber die echte Health-Leiste ("Nice! +10 hull") plus
  Fortschritt "Step 4/12" - so lernt man gleich die Leiste, die spaeter zaehlt.
- **Sprache Englisch** wie der Rest des Spiels.
- **Tempo:** erfolgreicher Schritt -> ~2 s Belohnung -> automatisch weiter. Reine
  Info-Schritte gehen weiter, sobald alle OK getippt haben. Host kann jederzeit einen
  Schritt **ueberspringen** oder das Training **abbrechen**.
- **Just-in-time-Tipps** im echten Spiel gehoeren mit in diesen Release (siehe unten).

**Ablauf** (im ganzen Training: kein Aderlass, keine steigende Todeslinie, keine
zufaelligen Pannen/Events). Jeder Spieler sieht eine **rollenabhaengige Infobox**:
- *Vorleser:* "Read this out loud. This control is NOT on your panel."
- *Ausfuehrender:* "Listen! Someone will call out a control on your panel." - Ziel-Control pulsiert.
- *Uebrige:* "Watch - your turn is next."

| # | Abschnitt | Inhalt | Weiter wenn |
|---|---|---|---|
| 0 | Briefing | Schiff, Ziel, jeder hat ein eigenes Panel | alle OK |
| 1 | Eigene Controls | Jeder bekommt einen Befehl aufs eigene Panel; lernt Button, Toggle, Slider, Selector, Dial | alle erledigt |
| 2 | Zurufen | Kette A liest -> B fuehrt aus, B -> C, ..., letzter -> A (jeder einmal Vorleser und Ausfuehrender) | Kette fertig |
| 3 | Alle gleichzeitig | Jeder hat einen Befehl, ohne Timer | alle erledigt |
| 4 | Timer & Leiste | Countdown-Balken (grosszuegig, ~40 s) + Health-Leiste erklaert; ein Ablauf wird einmal folgenlos gezeigt | 3 Befehle |
| 5 | Pannen | Jede der 6 Pannen einmal gezielt bei einem Spieler: Jammed (halten), Slime (wischen), Frozen (4x tippen), Short-circuit (halten), Overheat (warten, nicht anfassen), Loose wire (Stecker ziehen). Danach ein Befehl auf genau dieses Control: erst reparieren, dann ausfuehren | je Panne geloest |
| 6 | Events | Meteor (schuetteln), Black hole (umdrehen), Brace, Surge, Freeze (NICHT anfassen), Wormhole (Panels tauschen). Hier die Motion-Erlaubnis (iOS) abfragen. Fehlschlag = keine Strafe, "try again" | je Event bestanden |
| 7 | Abschluss | "Crew certified" -> zurueck in die Lobby oder direkt Casual-Runde | - |

**Just-in-time-Tipps (echtes Spiel):** Tritt eine Panne/ein Event auf diesem Geraet zum
ersten Mal auf, kurzer Hinweis (~2 s, z. B. "Swipe it off!"). Merker pro Geraet in
`localStorage` (try/catch). Faengt alle ab, die das Training ueberspringen.

**Umsetzung:**
- **shared:** neues `tutorial.ts` - Schritte als Daten (`setup(game)`, Erfolgsbedingung,
  Texte pro Rolle). Engine bekommt `mode: "normal" | "tutorial"`; im Tutorial sind
  Aderlass, Todeslinie, Pannen- und Event-Scheduler aus, Befehle ohne Deadline (ausser
  Abschnitt 4). Gezielte Engine-Methoden: "Befehl an Spieler A mit Ziel-Control auf Panel
  von B", "Panne X auf Control Y", "Event Z starten". `debugHazard`/`forceStartEvent` dafuer
  zu neutralen Methoden umbauen und von Debug + Tutorial gemeinsam nutzen. Deterministischer
  Durchlauf aller Schritte in einem Sim-Skript wie `test/sim.ts`.
- **Server:** Messages `startTutorial` (Host), `tutorialAck` (Info-OK), `tutorialSkip`
  und `tutorialAbort` (Host). State: Schritt, Gesamtzahl, pro Spieler Rolle + Coach-Text
  + hervorzuhebendes Control (Mechanik wie `dbgTargetControlId`/Reveal). `postStat` pro
  erreichtem Schritt (wo brechen Crews ab?).
- **Client:** neue `Coach.svelte` (Infobox, darf keine Controls verdecken - kleine
  Handys pruefen), Puls auf dem Ziel-Control, Option "Training" in der Lobby, Hinweis
  "New here? Start with Training" auf Home, Just-in-time-Tipps, Help-Overlay verweist
  aufs Training.

**Randfaelle:**
- Ab 2 Spielern. Bei vielen Spielern Zuruf-Kette (Abschnitt 2) auf ~4 Durchgaenge kappen.
- Disconnect: Schritte des fehlenden Spielers ueberspringen bzw. neu zuteilen; < 2 Spieler -> Training endet.
- Raum bleibt waehrend des Trainings gesperrt (wie im Spiel).
- Wormhole tauscht Panels dauerhaft - im Coach-Text erwaehnen.
- Ohne Motion-Sensor/Erlaubnis greift der bestehende Tap-Fallback.

---

## Audio & Optik

### A1 — Richtige Soundeffekte + mehr Juice   (Prio: mittel, Aufwand: S-M)
> ✅ **Grundstock in v0.7.0** (Klaxon-Alarm, Explosion, Break-Sound). Audio-Dateien optional offen.

**Problem:** Aktuell nur synthetische Beeps.

**Plan:**
- Variante A (self-contained, empfohlen als Start): reichere **synthetisierte** Sounds
  (Rausch-Bursts fuer Explosionen, **Klaxon-Alarm** bei niedriger Health, Fanfare beim
  Level-Up) - keine Asset-Dateien noetig.
- Variante B: kleine **Audio-Dateien** (mp3/ogg) mitliefern (Vite buendelt sie) -
  schoener, aber Assets muessen lizenzfrei/eigen sein.
- Effekte: bessere Completion-Animation, Schaden-Vignette + Alarm, Low-Health-Puls.

**Zu klaeren:** Synth-only oder Audio-Dateien? (Empfehlung: erst Synth + Klaxon-Alarm,
gratis und sehr on-theme.)

### A2 — Cockpit-Feinschliff weiter   (Prio: mittel, Aufwand: M, iterativ)
> 🔶 **In Arbeit** (v0.7.0: LED-Readouts, Scanline; v0.8.2: Kippschalter, Slider-Ticks). Weiter iterativ.

**Problem:** Erster Pass ist drin (Metall, Nieten, Glow). Das Original hat mehr:
physische Kippschalter, 7-Segment-Ziffern, Schiff/Starfield-Header, Panel-Fugen.

**Plan:** CSS iterativ - echter Kippschalter-Look, LED-Segment-Ziffern, schmaler
animierter Warp-Header (Vorsicht Hoehe auf dem Mini), Panel-Trennfugen. Nach jedem
Schritt auf dem Geraet pruefen.

**Zu klaeren:** Wie weit Richtung "busy Cockpit" vs. "clean/modern"?

---

## Polish & Infrastruktur

### P1 — Reconnect   (Prio: mittel, Aufwand: M)
> ✅ **Erledigt in v0.8.3** (Server haelt Platz ~30 s, Client reconnectet per Token, Overlay).

Aktuell beendet ein Disconnect die Runde. Ziel: Colyseus `allowReconnection` +
Rejoin-UI, damit ein kurzer Abbruch (Handy sperrt, WLAN wackelt) die Runde nicht killt.

### P2 — Huebscher 4-stelliger Raumcode   (Prio: niedrig, Aufwand: S-M)
> ✅ **Erledigt in v0.7.0** (4-Zeichen-Code via `filterBy`, Raum-Lock nach Start).

Aktuell dient die Colyseus-`roomId` als Code (z. B. `iHA-GlHtV`). Eigenes Matchmaking
fuer einen leicht tippbaren 4-Zeichen-Code (QR bleibt der Hauptweg).

### P3 — PWA-Installation   (Prio: niedrig, Aufwand: S-M)
> ✅ **Erledigt in v0.8.3** (manifest + service worker + apple-touch). Fuer knackige iOS-Icons spaeter PNGs.

Manifest + Service Worker, damit man Klaxon auf den Homescreen legen kann (Vollbild,
App-Gefuehl).

### P4 — Echtes 4x4-Packing   (Prio: niedrig, Aufwand: M)
Statt CSS-`dense` ein echtes Bin-Packing ohne Luecken. Seit "wenige Kacheln" kaum noch
noetig - nur falls Luecken stoeren.

### P6 — Debug-Panel absichern   (Prio: niedrig, jetzt; hoch vor oeffentlichem Launch)
> ✅ **Mechanismus da (v0.8.21):** optionaler Server-Env `DEBUG_KEY`; ist er gesetzt, schaltet nur `?debug=<KEY>` frei. Fuer den oeffentlichen Launch einmal setzen.
Das Debug-Panel (`?debug` / Version 5x tippen) ist nur host-geprueft, nicht passwort-/
serverseitig gesperrt. Fuer den Freundeskreis ok. Vor einem echten oeffentlichen Launch:
serverseitig nur bei gesetztem Debug-Flag erlauben (z. B. Env `ALLOW_DEBUG=1`), sonst
`debug:*`-Messages ignorieren.

### P5 — Kleinkram   (Prio: niedrig, Aufwand: S)
Mehr Technobabble-Vielfalt (Wortlisten erweitern), Feintuning der Schwierigkeitskurve
nach weiteren Playtests, evtl. Spielernamen serverseitig eindeutig machen.

### P7 — Feinschliff aus Okt-Playtests   (Prio: niedrig, Aufwand: S)
- **Insane-Obergrenze:** Schwierigkeit cappt um Sektor ~8-9; falls Insane oben nochmal haerter
  werden soll, Caps in `difficulty.ts` fuer hohe Level anheben (reine Balance).
- **Aufraeumen:** unbenutzte `packages/server/src/stats.ts` entfernen (nicht importiert).
- **Tuning nach echtem Spiel:** Tap-Fallback-Anzahl (aktuell 10) und Schuld-Toast-Texte
  (Formulierung/Sprache) bei Bedarf anpassen.

### P8 — TypeScript 7   (Prio: niedrig, Aufwand: M, blockiert)
TS 7 (Go-native) ist da, aber Svelte/Vite-Tooling braucht die TS-API (ab 7.1). Per
Dependabot-Ignore zurueckgestellt; nachziehen, sobald die Tools TS7 unterstuetzen.

---

## Erledigt (Auszug)

Siehe [CHANGELOG](CHANGELOG.md): Namen, Play-again, Sound (Basis), Screenshake,
Level-Banner, Countdown, Cold-Start-Overlay + Retry, How-to-play, Schwierigkeits-Presets,
End-of-game-Stats, In-Game-Feedback (persistent via ntfy/Google Sheet), One-Screen-Fit,
Cockpit-Pass, Alien-Schleim, 8 Spieler, Kick, Offline-Anzeige, Reconnect, PWA, 6 Events (inkl. echtes Wurmloch), In-Game-Debug-Panel (?debug) mit Server-Stats, responsive/kompakte Kacheln + Pro-Geraet-Kachel-Cap, CI-Build-Gate.

**Neuer (ab v0.8.44):** Dependabot + sichere Dep-Updates, **Node 26**, **Rebrand @klaxon/\***,
Teilen-Button + OG-Vorschau + Scan-to-Join-Prefill, **MIT-Lizenz**, animierter Trailer (mit Soundtrack),
Safe-Area-Fix (Notch), groessere Labels, Dial echter Kreis, **Crew-Rang + Bestwert** + Scoreboard-Legende,
**/health** (Keep-warm-Cron) + **/stats** + Live-"crews playing"-Badge, **Motion-first Events** (Tap teurer/klein),
garantierte **Panel-Vielfalt**, **Schuld-Toast** bei verpatzten Events, Boarding-Karte nur bei echtem Kaltstart.
