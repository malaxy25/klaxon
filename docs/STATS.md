# Klaxon — Usage-Log (persistent, ohne Datenbank)

Optionales Nutzungs-Log ueber einen Webhook (z. B. Google Sheet via Apps Script).
Nicht gesetzt -> kein Log. Es werden **keine Spielernamen** geloggt, nur Zahlen.

## Ereignisse (eine Zeile je Ereignis)
- **start** - beim Spielstart: `room` (4-Zeichen-Code als ID), `players`,
  `startSector` (Start-Schwierigkeit), `motion` (wie viele der Crew Gyro/Tilt aktiv hatten).
- **end** - beim **Game-Over**: `room`, `players`, `peakPlayers`, `startSector`,
  `endSector` (erreichter Sektor), `durationSec`.

Mehrere Spiele im selben Raum -> mehrere start/end-Paare (gleicher `room`-Code).

## Spalten im Tab "Usage"
`timestamp | event | room | players | peak | startSector | endSector | motion | durationSec`

- **peak** = hoechste Zahl gleichzeitig anwesender Spieler waehrend des Spiels
  (kleiner als `players` am Ende ist unmoeglich; groesser heisst: jemand ging waehrenddessen).
- **motion** = Anzahl Spieler mit aktiviertem Gyro/Tilt beim Start (Rest nutzt Tap-Fallback).

## Einrichten
1. Google-Sheet -> Erweiterungen -> Apps Script -> `doPost` unten einsetzen.
2. Bereitstellen (Web-App), `/exec`-URL kopieren, nach jeder Aenderung **neu deployen**.
3. Auf `klaxon-backend` **`STATS_WEBHOOK`** auf diese URL setzen (darf dieselbe sein wie fuers Feedback-Sheet).

```javascript
function doPost(e) {
  var body = e.postData ? e.postData.contents : "";
  var j = null;
  try { j = JSON.parse(body); } catch (err) {}
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (j && j.event) {
    var u = ss.getSheetByName("Usage");
    if (!u) { u = ss.insertSheet("Usage");
      u.appendRow(["timestamp","event","room","players","peak","startSector","endSector","motion","durationSec"]); }
    u.appendRow([new Date(), j.event, j.room||"", j.players||"", j.peakPlayers||"", j.startSector||"", j.endSector||"", j.motion||"", j.durationSec||""]);
    return ContentService.createTextOutput("ok");
  }
  var sheet = ss.getSheets()[0];
  var msg = body; if (j) { msg = j.text || j.content || body; }
  sheet.appendRow([new Date(), msg]);
  return ContentService.createTextOutput("ok");
}
```

Hinweis: Bei bereits vorhandenem "Usage"-Tab mit alten Spalten diesen loeschen -
das Script legt ihn beim naechsten Event korrekt neu an.
