# Klaxon — Usage/Device/Feedback-Log (persistent, ohne Datenbank)

Optionale Logs ueber Webhook(s) -> Google Sheet (Apps Script). Keine Spielernamen, nur Zahlen/Text.
- Usage/Device: Env **`STATS_WEBHOOK`** (Apps-Script-URL).
- Feedback in die Tabelle: **`FEEDBACK_WEBHOOK_2`** = dieselbe Apps-Script-URL (ntfy bleibt Text).

## Gemeinsamer Join-Key
- **`rid`** = eindeutige Colyseus-roomId -> **der** Schluessel ueber alle Tabellen
  (der 4-Zeichen-`room`-Code ist menschenlesbar, wiederholt sich aber ueber die Zeit).
- **`pid`** = Session-ID des Spielers (nur device + feedback) -> Geraet <-> Feedback verbinden.

So joinbar: `Devices.rid = Usage.rid` (welche Geraete in welchem Spiel),
`Feedback.pid = Devices.pid` (welches Geraet gab das Feedback).

## Tabs & Spalten
- **Usage** (start/end je Spiel): `timestamp | event | rid | room | players | peak | startSector | endSector | motion | durationSec`
  - `peak` = max. gleichzeitige Spieler; `motion` = Anzahl mit Gyro/Tilt beim Start.
- **Devices** (pro Beitritt): `timestamp | rid | room | pid | os | w | h | dpr | orient | pwa`
  - `os` = ios/android/desktop; `w/h` = Fenstergroesse; `dpr` = Pixelverhaeltnis; `orient` = portrait/landscape;
    `pwa` = yes/no (vom Homescreen als App gestartet). Kein Modell/UA.
- **Feedback**: `timestamp | rid | room | pid | msg`

## Einrichten
1. Google-Sheet -> Erweiterungen -> Apps Script -> `doPost` unten einsetzen -> neu deployen.
2. `STATS_WEBHOOK` (Usage+Device) und ggf. `FEEDBACK_WEBHOOK_2` (Feedback) auf die `/exec`-URL setzen.

```javascript
function doPost(e) {
  var body = e.postData ? e.postData.contents : "";
  var j = null;
  try { j = JSON.parse(body); } catch (err) {}
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (j && j.event) {
    if (j.event === "device") {
      sheetWithHeader(ss, "Devices", ["timestamp","rid","room","pid","os","w","h","dpr","orient","pwa"])
        .appendRow([new Date(), j.rid||"", j.room||"", j.pid||"", j.os||"", j.w||"", j.h||"", j.dpr||"", j.orient||"", j.pwa ? "yes" : "no"]);
    } else if (j.event === "feedback") {
      sheetWithHeader(ss, "Feedback", ["timestamp","rid","room","pid","msg"])
        .appendRow([new Date(), j.rid||"", j.room||"", j.pid||"", j.msg||""]);
    } else {
      sheetWithHeader(ss, "Usage", ["timestamp","event","rid","room","players","peak","startSector","endSector","motion","durationSec"])
        .appendRow([new Date(), j.event, j.rid||"", j.room||"", j.players||"", j.peakPlayers||"", j.startSector||"", j.endSector||"", j.motion||"", j.durationSec||""]);
    }
    return ContentService.createTextOutput("ok");
  }
  var sheet = ss.getSheets()[0];
  var msg = body; if (j) { msg = j.text || j.content || body; }
  sheet.appendRow([new Date(), msg]);
  return ContentService.createTextOutput("ok");
}
function sheetWithHeader(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); }
  return sh;
}
```

Hinweis: Bei vorhandenen Tabs mit alten Spalten diese loeschen - das Script legt sie korrekt neu an.
