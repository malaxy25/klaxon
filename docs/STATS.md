# Klaxon — Usage-Log (persistent, ohne Datenbank)

Optionales Nutzungs-Log ueber einen Webhook (z. B. Google Sheet via Apps Script).
Nicht gesetzt -> kein Log. Es werden **keine Spielernamen** geloggt, nur Zahlen.

## Was wird geloggt (eine Zeile je Ereignis)
- **start** - wenn ein Spiel startet: `room` (4-Zeichen-Code als ID), `players`, `startLevel`.
- **end** - wenn ein Raum geschlossen wird: `room`, `peakPlayers`, `durationSec`.

Kein periodischer Snapshot (bewusst, um die Tabelle nicht zuzumuellen). "Wie viele Raeume
gleichzeitig" laesst sich aus den start/end-Zeitstempeln rekonstruieren/charten.

## Einrichten
1. Google-Sheet oeffnen -> Erweiterungen -> Apps Script.
2. Das `doPost` unten einsetzen (routet Usage in den Tab "Usage", Feedback ins 1. Blatt).
3. Bereitstellen (Web-App), `/exec`-URL kopieren.
4. Auf `klaxon-backend` die Env-Variable **`STATS_WEBHOOK`** auf diese URL setzen.
   (Darf dieselbe Apps-Script-URL sein wie fuers Sheet-Feedback - das Script trennt nach Inhalt.)

```javascript
function doPost(e) {
  var body = e.postData ? e.postData.contents : "";
  var j = null;
  try { j = JSON.parse(body); } catch (err) {}
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (j && j.event) {
    var u = ss.getSheetByName("Usage");
    if (!u) { u = ss.insertSheet("Usage");
      u.appendRow(["timestamp","event","room","players","peak","durationSec","startLevel"]); }
    u.appendRow([new Date(), j.event, j.room||"", j.players||"", j.peakPlayers||"", j.durationSec||"", j.startLevel||""]);
    return ContentService.createTextOutput("ok");
  }
  var sheet = ss.getSheets()[0];
  var msg = body; if (j) { msg = j.text || j.content || body; }
  sheet.appendRow([new Date(), msg]);
  return ContentService.createTextOutput("ok");
}
```

Nach jeder Script-Aenderung im Apps-Script-Editor **neu deployen** (neue Version); die
`/exec`-URL bleibt gleich.
