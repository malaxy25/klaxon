# Klaxon — Backlog (Known Issues & Improvements)

Offene Punkte aus Playtests und Ideen. Wir gehen sie **einzeln** an: pro Punkt steht
hier ein Loesungsplan; bevor gebaut wird, besprechen wir den Ansatz im Chat und
verfeinern ihn. Erledigtes wandert ins [CHANGELOG](CHANGELOG.md).

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
Das Debug-Panel (`?debug` / Version 5x tippen) ist nur host-geprueft, nicht passwort-/
serverseitig gesperrt. Fuer den Freundeskreis ok. Vor einem echten oeffentlichen Launch:
serverseitig nur bei gesetztem Debug-Flag erlauben (z. B. Env `ALLOW_DEBUG=1`), sonst
`debug:*`-Messages ignorieren.

### P5 — Kleinkram   (Prio: niedrig, Aufwand: S)
Mehr Technobabble-Vielfalt (Wortlisten erweitern), Feintuning der Schwierigkeitskurve
nach weiteren Playtests, evtl. Spielernamen serverseitig eindeutig machen.

---

## Erledigt (Auszug)

Siehe [CHANGELOG](CHANGELOG.md): Namen, Play-again, Sound (Basis), Screenshake,
Level-Banner, Countdown, Cold-Start-Overlay + Retry, How-to-play, Schwierigkeits-Presets,
End-of-game-Stats, In-Game-Feedback (persistent via ntfy/Google Sheet), One-Screen-Fit,
Cockpit-Pass, Alien-Schleim, 8 Spieler, Kick, Offline-Anzeige, Reconnect, PWA, 6 Events (inkl. echtes Wurmloch), In-Game-Debug-Panel (?debug) mit Server-Stats, responsive/kompakte Kacheln + Pro-Geraet-Kachel-Cap, CI-Build-Gate.
