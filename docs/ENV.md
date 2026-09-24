# Klaxon — Umgebungsvariablen

Render setzt Env-Variablen **pro Dienst**. Klaxon hat zwei Dienste, also gibt es zwei
getrennte Sets. Import jeweils im Render-Dashboard: Dienst -> **Environment** ->
**Add from .env** -> Block einfuegen -> **Save Changes** (deployt neu).

## Uebersicht

| Variable            | Dienst          | Zweck                                             | Noetig?        |
|---------------------|-----------------|---------------------------------------------------|----------------|
| `VITE_SERVER_URL`   | Static Site     | wss://-URL des Servers (Build-Zeit in Client)     | **ja**         |
| `FEEDBACK_WEBHOOK`  | klaxon-backend  | Feedback-Ziel (z. B. ntfy.sh)                     | optional       |
| `FEEDBACK_WEBHOOK_2`| klaxon-backend  | Zweites Feedback-Ziel (z. B. Google Sheet)        | optional       |
| `STATS_WEBHOOK`     | klaxon-backend  | Usage-Log (start/end je Raum) -> Sheet; siehe docs/STATS.md | optional       |
| `FORCE_EVENT`       | klaxon-backend  | Debug: erzwingt einen Event-Typ                    | nur Test       |
| `DEBUG_TARGETS`     | klaxon-backend  | Debug: legt Befehlsziele in den State (fuer Tests) | nur Test       |
| `SINGLE_PLAYER`     | klaxon-backend  | Debug: Start mit 1 Spieler erlaubt                 | nur Test       |
| `DEBUG_KEY`         | klaxon-backend  | Optional: sperrt das Debug-Panel; nur `?debug=<KEY>` schaltet frei | nur oeffentl.  |
| `PORT`              | klaxon-backend  | Port - **setzt Render automatisch**               | NICHT setzen   |
| `NODE_ENV`          | klaxon-backend  | wird vom Dockerfile auf `production` gesetzt        | NICHT setzen   |

`FORCE_EVENT`-Werte: `meteor` | `blackhole` | `brace` | `surge` | `freeze` | `wormhole`.
Im Normalbetrieb leer lassen / entfernen.

> Tipp: Zum Live-Testen brauchst du `FORCE_EVENT` meist gar nicht mehr - oeffne ein
> Spiel mit `?debug` in der URL und nutze das Host-Debug-Panel (Events ausloesen,
> Hazards, Health, Sektor, Solve, Pause, Server-Stats).

---

## Import-Block: Static Site (`klaxon`)

```
VITE_SERVER_URL=wss://klaxon-w8xo.onrender.com
```

## Import-Block: Server (`klaxon-backend`)

Nur die, die du wirklich willst. Platzhalter durch deine echten URLs ersetzen:

```
FEEDBACK_WEBHOOK=https://ntfy.sh/DEIN-TOPIC
FEEDBACK_WEBHOOK_2=https://script.google.com/macros/s/DEINE-ID/exec
```

## Debug-Variablen (nur zum Testen, danach entfernen!)

Diese NICHT dauerhaft setzen - sie veraendern das Verhalten fuer alle Raeume:

```
# FORCE_EVENT=wormhole
# DEBUG_TARGETS=1
# SINGLE_PLAYER=1
```
