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
- **Feedback**: `timestamp | rid | room | pid | msg | email | contact`
  - `email` optional (vom Server validiert, sonst leer); `contact` = yes/no (Spieler erlaubt Kontaktaufnahme).
    Email geht nur ans Sheet, nicht an ntfy und nicht ins Server-Log.

## Einrichten
1. Google-Sheet -> Erweiterungen -> Apps Script -> `doPost` unten einsetzen -> neu deployen.
2. `STATS_WEBHOOK` (Usage+Device) und ggf. `FEEDBACK_WEBHOOK_2` (Feedback) auf die `/exec`-URL setzen.

```javascript
// ---- Konfiguration ----
var TABS = { device: "Devices", feedback: "Feedback" };        // alles andere -> "Usage"
var SKIP = ["ts", "content", "text"];                          // nie als Spalte (ts = Server-Zeit, content/text = Rohzeile mit Name)
var SKIP_EVENT = ["Devices", "Feedback"];                      // dort ist "event" redundant
var ALIAS = { peakPlayers: "peak" };                           // Feldname -> bestehender Spaltenname
var FORMAT = { pwa: function (v) { return v ? "yes" : "no"; } };
var MAIL_TO = "";                                              // leer = Besitzer des Scripts

function doPost(e) {
  var body = e.postData ? e.postData.contents : "";
  var j = null;
  try { j = JSON.parse(body); } catch (err) {}
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);                                        // parallele Requests: keine doppelten Spalten
  try {
    if (j && j.event) {
      var name = TABS[j.event] || "Usage";
      appendRecord(ss, name, j, SKIP_EVENT.indexOf(name) >= 0 ? ["event"] : []);
    } else {
      var msg = body; if (j) { msg = j.text || j.content || body; }
      ss.getSheets()[0].appendRow([new Date(), msg]);
    }
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput("ok");
}

// Schreibt j nach Spaltennamen; unbekannte Felder werden als neue Spalte rechts angehaengt.
function appendRecord(ss, name, j, extraSkip) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = sh.getLastColumn();
  var header = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  if (header.indexOf("timestamp") < 0) header.unshift("timestamp");
  var row = {};
  row.timestamp = new Date();
  Object.keys(j).forEach(function (k) {
    if (SKIP.indexOf(k) >= 0 || extraSkip.indexOf(k) >= 0) return;
    var col = ALIAS[k] || k, v = j[k];
    if (FORMAT[col]) v = FORMAT[col](v);
    else if (typeof v === "boolean") v = v ? "yes" : "no";
    else if (v !== null && typeof v === "object") v = JSON.stringify(v);
    if (header.indexOf(col) < 0) header.push(col);
    row[col] = v;
  });
  if (header.length !== lastCol) sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  sh.appendRow(header.map(function (h) { return row[h] === undefined || row[h] === null ? "" : row[h]; }));
}

// Taegliche Zusammenfassung: nur wenn seit dem letzten Mail neues Feedback kam.
function dailyFeedbackDigest() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Feedback");
  if (!sh) return;
  var props = PropertiesService.getScriptProperties();
  var last = sh.getLastRow();
  var done = Number(props.getProperty("feedbackMailedRow") || 1); // Zeile 1 = Kopfzeile
  if (last < done) { props.setProperty("feedbackMailedRow", String(last)); return; } // Zeilen geloescht
  if (last === done) return;
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows = sh.getRange(done + 1, 1, last - done, header.length).getValues();
  var col = function (r, n) { var i = header.indexOf(n); return i < 0 ? "" : r[i]; };
  var lines = rows.map(function (r) {
    var ts = Utilities.formatDate(new Date(col(r, "timestamp")), Session.getScriptTimeZone(), "dd.MM. HH:mm");
    var who = col(r, "email") ? "  <" + col(r, "email") + ">" + (col(r, "contact") === "yes" ? " (Kontakt OK)" : "") : "";
    return ts + "  [" + col(r, "room") + "]" + who + "\n  " + col(r, "msg");
  });
  var to = MAIL_TO || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(to, "Klaxon: " + rows.length + " neues Feedback",
    lines.join("\n\n") + "\n\n" + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  props.setProperty("feedbackMailedRow", String(last));
}

// Einmal manuell ausfuehren: legt den taeglichen Trigger an (ca. 21-22 Uhr Script-Zeitzone).
function setupDailyDigest() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "dailyFeedbackDigest") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("dailyFeedbackDigest").timeBased().everyDays(1).atHour(21).create();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Feedback");
  PropertiesService.getScriptProperties().setProperty("feedbackMailedRow", String(sh ? sh.getLastRow() : 1));
}
```

Spalten sind generisch: Das Script liest die Kopfzeile und schreibt jedes Feld in die gleichnamige
Spalte. Neue Felder vom Server erscheinen automatisch als neue Spalte rechts; bestehende Tabs und
Daten bleiben unveraendert. Spalten im Sheet umsortieren ist erlaubt (Zuordnung per Name).

Taegliches Feedback-Mail: im Apps-Script-Editor einmal `setupDailyDigest` ausfuehren und die
Berechtigungen (Mail, Trigger) bestaetigen. Danach kommt jeden Abend ein Mail, aber nur wenn es
seit dem letzten Mail neues Feedback gab. Empfaenger = `MAIL_TO` oder der Script-Besitzer.
Zeitzone pruefen: Projekteinstellungen -> Zeitzone auf `Europe/Zurich`, sonst kommt das Mail zur falschen Stunde.
