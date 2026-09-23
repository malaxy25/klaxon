# Klaxon — Client

Der Svelte-Client. Vollstaendige Dateien mit Pfad. BOM-frei + ASCII (siehe GETTING-STARTED.md).

## Neu in v0.8.14

- Zwei Musik-Modi: ruhig (Home/Lobby/Game-Over) -> treibend beim Spielstart, zurueck danach.
  Auto-Umschaltung per applyAmbient(); Audio-Unlock beim ersten Tap (unlockAudio()).
- Debug-Panel "Sounds": Alarm + Mute + Einzel-Sounds (Ambient laeuft automatisch).

## Dateibaum

```
packages/client/
├── index.html  public/{favicon.svg, manifest.webmanifest, sw.js}
└── src/ app.css, App.svelte,
       lib/ store.svelte.ts, Debug.svelte, EventOverlay.svelte, Help.svelte,
            Connecting.svelte, Control.svelte, Home.svelte, Lobby.svelte,
            Game.svelte, GameOver.svelte
```

---

# Vollstaendige Dateien

## Datei: `spaceteam/packages/client/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Klaxon</title>
    <meta name="theme-color" content="#0e1c1b" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Klaxon" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
    <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
      }
    </script>
  </body>
</html>
```

## Datei: `spaceteam/packages/client/public/manifest.webmanifest`

```json
{
  "name": "Klaxon",
  "short_name": "Klaxon",
  "description": "A cooperative shouting party game for the same room.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0e1c1b",
  "theme_color": "#0e1c1b",
  "icons": [
    { "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "maskable" }
  ]
}
```

## Datei: `spaceteam/packages/client/public/sw.js`

```js
// Minimaler Service Worker: nur damit die App installierbar ist (network-first).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
```

## Datei: `spaceteam/packages/client/public/favicon.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0e1c1b"/>
  <path d="M32 13 L54 51 H10 Z" fill="#f5a623"/>
  <rect x="29" y="25" width="6" height="14" rx="3" fill="#1a1205"/>
  <circle cx="32" cy="45" r="3.3" fill="#1a1205"/>
</svg>
```

## Datei: `spaceteam/packages/client/src/app.css`

```css
/* Spaceteam - analoges Instrumenten-Cockpit-Theme */
:root {
  --bg: #0e1c1b;
  --panel: #14302c;
  --panel-2: #1c413b;
  --ink: #f2e9d0;
  --muted: #8fa8a2;
  --amber: #f5a623;
  --amber-ink: #1a1205;
  --danger: #e5484d;
  --ok: #57c08a;
  --line: #2c524c;
  --radius: 10px;
  color-scheme: dark;
}

* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background:
    radial-gradient(120% 80% at 50% -10%, #16332f 0%, var(--bg) 60%);
  color: var(--ink);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
#app { min-height: 100%; }

h1 { font-size: 1.9rem; letter-spacing: 0.5px; margin: 0 0 0.2em; }
.tagline, .hint { color: var(--muted); font-size: 0.95rem; line-height: 1.4; }
.error { color: var(--danger); font-weight: 600; }

/* Buttons */
.btn {
  appearance: none; border: 1px solid var(--line);
  background: var(--panel-2); color: var(--ink);
  padding: 0.7em 1em; border-radius: var(--radius);
  font-size: 1rem; font-weight: 600; cursor: pointer;
  transition: transform 0.05s ease, background 0.15s ease, border-color 0.15s ease;
}
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn.primary { background: var(--amber); color: var(--amber-ink); border-color: var(--amber); }
.btn.wide { width: 100%; padding: 0.9em; }
.btn.on { background: var(--amber); color: var(--amber-ink); border-color: var(--amber); }

.input {
  flex: 1; padding: 0.8em; font-size: 1.1rem; letter-spacing: 2px;
  border: 1px solid var(--line); border-radius: var(--radius);
  background: #0c1a19; color: var(--ink); text-transform: none;
}

/* Layout container for all screens */
.home, .lobby, .over {
  max-width: 460px; margin: 0 auto; padding: 6vh 20px 40px;
  display: flex; flex-direction: column; gap: 16px;
}
.or { text-align: center; color: var(--muted); font-size: 0.9rem; }
.join-row { display: flex; gap: 8px; }

/* Lobby */
.join-card {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 18px; text-align: center;
}
.join-card .code {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 2rem; letter-spacing: 4px; color: var(--amber);
}
.join-card .qr { margin: 12px auto 6px; display: block; border-radius: 8px; }
.join-card .url { color: var(--muted); font-size: 0.75rem; word-break: break-all; background: none; border: none; padding: 2px 4px; font: inherit; cursor: pointer; touch-action: manipulation; text-align: center; }
.join-card .url:active { opacity: 0.7; }
.join-card .urlhint { color: var(--muted); font-size: 0.65rem; opacity: 0.7; margin-top: 2px; }
.players { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.players li {
  display: flex; justify-content: space-between;
  padding: 0.6em 0.8em; border: 1px solid var(--line);
  border-radius: 8px; background: var(--panel);
}
.players li.ready { border-color: var(--ok); }
.players li.ready span:last-child { color: var(--ok); }

@media (prefers-reduced-motion: no-preference) {
  .command-inner.pulse { animation: pop 0.25s ease; }
}
@keyframes pop { from { transform: scale(1.06); } to { transform: scale(1); } }

/* Name field */
.field { display: flex; flex-direction: column; gap: 4px; text-align: left; }
.field > span { color: var(--muted); font-size: 0.8rem; }
.input.name { letter-spacing: 0; font-size: 1rem; }

/* Version / GitHub footer */
.version { text-align: center; color: var(--muted); font-size: 0.72rem; margin-top: 6px; }
.version a { color: var(--muted); }
.version a:hover { color: var(--amber); }

/* Help link */
.helplink { background: none; border: none; color: var(--muted); text-decoration: underline; cursor: pointer; font-size: 0.85rem; padding: 0; align-self: center; }
.helplink:hover { color: var(--amber); }

/* Difficulty presets (lobby) */
.difficulty { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.diff-label { color: var(--muted); font-size: 0.9rem; }
.diff-label b { color: var(--ink); }
.diff-opts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.btn.diff { padding: 0.5em 0.8em; font-size: 0.85rem; }

/* Subtle starfield background (cockpit flavor) */
body {
  background-color: var(--bg);
  background-image:
    radial-gradient(1px 1px at 18% 28%, rgba(255,255,255,0.5), transparent),
    radial-gradient(1px 1px at 72% 62%, rgba(255,255,255,0.35), transparent),
    radial-gradient(1px 1px at 42% 82%, rgba(255,255,255,0.3), transparent),
    radial-gradient(1px 1px at 88% 18%, rgba(255,255,255,0.4), transparent),
    radial-gradient(1px 1px at 60% 12%, rgba(255,255,255,0.28), transparent),
    radial-gradient(120% 80% at 50% -10%, #16332f 0%, var(--bg) 70%);
  background-attachment: fixed;
}

/* No text selection / callout during play (fixes iOS long-press selection) */
.game, .game *, .event-overlay, .event-overlay * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }

/* Event pass/fail banner */
.ev-result { position: fixed; inset: 0; z-index: 55; display: flex; align-items: center; justify-content: center; pointer-events: none; font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-size: 2.3rem; letter-spacing: 3px; }
.ev-result.passed { color: var(--ok); background: rgba(87,192,138,0.16); text-shadow: 0 0 16px rgba(87,192,138,0.8); }
.ev-result.failed { color: var(--danger); background: rgba(229,72,77,0.2); text-shadow: 0 0 16px rgba(229,72,77,0.9); }

/* Reconnecting overlay */
.reconnect-overlay { position: fixed; inset: 0; z-index: 58; display: flex; align-items: center; justify-content: center; background: rgba(10,22,21,0.92); }
.reconnect-overlay .rc-box { font-family: ui-monospace, Menlo, monospace; color: var(--amber); font-size: 1.3rem; letter-spacing: 2px; }

/* Lobby: offline players + kick */
.players li.offline { opacity: 0.55; }
.players li.offline span:last-child { color: var(--danger); }
.pstatus { display: inline-flex; align-items: center; gap: 8px; }
.kick { appearance: none; border: 1px solid var(--line); background: transparent; color: var(--danger); border-radius: 6px; width: 22px; height: 22px; line-height: 1; cursor: pointer; font-weight: 700; padding: 0; }
.kick:hover { background: var(--danger); color: #fff; }

/* Prevent iOS double-tap-zoom from swallowing rapid taps on any button */
button, .btn, .tapbtn { touch-action: manipulation; }
```

## Datei: `spaceteam/packages/client/src/App.svelte`

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { S, joinByCode, openHelp, initMotion, initDebug, applyAmbient, unlockAudio } from "./lib/store.svelte";
  import Home from "./lib/Home.svelte";
  import Lobby from "./lib/Lobby.svelte";
  import Game from "./lib/Game.svelte";
  import GameOver from "./lib/GameOver.svelte";
  import Connecting from "./lib/Connecting.svelte";
  import Help from "./lib/Help.svelte";
  import EventOverlay from "./lib/EventOverlay.svelte";
  import Debug from "./lib/Debug.svelte";

  onMount(() => {
    initMotion();
    initDebug();
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    const r = new URLSearchParams(location.search).get("r");
    if (r) {
      joinByCode(r);
    } else {
      try {
        if (!localStorage.getItem("klaxon_seen_help")) {
          openHelp();
          localStorage.setItem("klaxon_seen_help", "1");
        }
      } catch { /* ignore */ }
    }
  });

  $effect(() => { void S.screen; void S.muted; applyAmbient(); });
</script>

{#if S.screen === "home"}
  <Home />
{:else if S.screen === "lobby"}
  <Lobby />
{:else if S.screen === "game"}
  <Game />
{:else}
  <GameOver />
{/if}

{#if S.eventType}<EventOverlay />{/if}
{#if S.eventResult}
  <div class="ev-result {S.eventResult}">{S.eventResult === "passed" ? "SURVIVED" : "HULL BREACH"}</div>
{/if}
{#if S.reconnecting}<div class="reconnect-overlay"><div class="rc-box">Reconnecting...</div></div>{/if}
{#if S.connecting}<Connecting />{/if}
{#if S.showHelp}<Help />{/if}
{#if S.debug}<Debug />{/if}
```

## Datei: `spaceteam/packages/client/src/lib/store.svelte.ts`

```ts
import { Client } from "@colyseus/sdk";

export const VERSION = "0.8.14";
export const REPO_URL = "https://github.com/malaxy25/klaxon";

export type ControlView = {
  id: string; kind: string; label: string; value: string;
  min: number; max: number; options: string[]; w: number; h: number; hazard: string;
};
export type PlayerView = {
  id: string; name: string; host: boolean; ready: boolean;
  connected: boolean; instructionText: string; panel: ControlView[];
  statCompleted: number; statExpired: number; eventDone: boolean; dbgTargetControlId: string; dbgTargetValue: string;
};

function lsGet(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export const S = $state({
  screen: "home" as "home" | "lobby" | "game" | "over",
  connecting: false,
  error: "",
  roomId: "",
  code: "",
  sessionId: "",
  name: lsGet("klaxon_name", "Player"),
  muted: lsGet("klaxon_muted", "0") === "1",
  phase: "lobby",
  level: 0,
  health: 50,
  deathLimit: 0,
  players: [] as PlayerView[],
  flash: "" as "" | "good" | "bad",
  shake: false,
  banner: "",
  showHelp: false,
  startLevel: 3,
  eventType: "",
  eventMs: 0,
  eventResult: "" as "" | "passed" | "failed",
  motionOk: false,
  reconnecting: false,
  debug: false,
  stats: null as any,
  feedbackSent: false,
});

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string) ?? "ws://localhost:2567";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Cold-Start-sicher: der erste Versuch kann ins Timeout laufen, waehrend der
// Render-Free-Server aufwacht -> ein paar Sekunden warten und erneut versuchen.
function genCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += abc[Math.floor(Math.random() * abc.length)];
  return c;
}

async function connectWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + 70000;
  for (;;) {
    try { return await fn(); }
    catch (e) {
      if (Date.now() > deadline) throw e;
      await sleep(2500);
    }
  }
}

let client: Client | null = null;
let room: any = null;
let reconToken = "";
let flashTimer: ReturnType<typeof setTimeout> | undefined;
let shakeTimer: ReturnType<typeof setTimeout> | undefined;
let bannerTimer: ReturnType<typeof setTimeout> | undefined;

// ---- Sound (Web Audio, ohne Asset-Dateien) ----
let audioCtx: AudioContext | null = null;
function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch { /* kein Audio verfuegbar */ }
}
function beep(freq: number, durMs: number, type: OscillatorType = "square", gain = 0.05) {
  if (S.muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + durMs / 1000);
}
function noiseBurst(durMs: number, gain = 0.08) {
  if (S.muted || !audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor((sr * durMs) / 1000);
  const buf = audioCtx.createBuffer(1, len, sr); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const g = audioCtx.createGain(); g.gain.setValueAtTime(gain, audioCtx.currentTime);
  src.connect(g).connect(audioCtx.destination); src.start();
}

function sweep(f0: number, f1: number, durMs: number, type: OscillatorType = "sine", gain = 0.06) {
  if (S.muted || !audioCtx) return;
  const t = audioCtx.currentTime, dur = durMs / 1000;
  const o = audioCtx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + dur + 0.03);
}

let ambient: { stop: () => void; mode: "calm" | "drive" } | null = null;

// Treibender Synth-Bass-Loop (A-Moll), wird pro Sektor schneller - im Spiel.
const DRIVE_SEQ = [220.0, 220.0, 329.63, 220.0, 261.63, 220.0, 392.0, 329.63];
function driveStepMs() { return Math.max(120, 210 - (S.level || 1) * 8); }
function ambientNote(freq: number, dur = 0.16, gain = 0.05, type: OscillatorType = "sawtooth") {
  if (S.muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + dur + 0.03);
}
function pulseHit(gain = 0.05) {
  if (S.muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); o.type = "square";
  o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.09);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + 0.14);
}

// Ruhiger Melodie-Loop (Am/F) - im Menue/Lobby/Game-Over.
const CALM_PHRASES = [
  [220.0, 261.63, 329.63, 440.0, 392.0, 329.63, 293.66, 261.63],
  [174.61, 261.63, 349.23, 440.0, 349.23, 293.66, 261.63, 220.0],
];
function calmNote(freq: number) {
  if (S.muted || !audioCtx) return;
  const t = audioCtx.currentTime, dur = 0.7;
  const o = audioCtx.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
  const o2 = audioCtx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const g2 = audioCtx.createGain(); g2.gain.value = 0.3;
  o.connect(g).connect(audioCtx.destination); o2.connect(g2); g2.connect(g);
  o.start(t); o.stop(t + dur + 0.05); o2.start(t); o2.stop(t + dur + 0.05);
}

function startDrive(): { stop: () => void; mode: "drive" } {
  const st = { i: 0, stopped: false, h: undefined as any };
  const loop = () => {
    if (st.stopped) return;
    const beat = st.i % 8;
    ambientNote(DRIVE_SEQ[beat]);
    if (beat === 0) pulseHit(0.06); else if (beat === 4) pulseHit(0.045);
    st.i++; st.h = setTimeout(loop, driveStepMs());
  };
  loop();
  return { mode: "drive", stop: () => { st.stopped = true; clearTimeout(st.h); } };
}
function startCalm(): { stop: () => void; mode: "calm" } {
  const st = { i: 0, stopped: false, h: undefined as any };
  const loop = () => {
    if (st.stopped) return;
    const ph = CALM_PHRASES[Math.floor(st.i / 8) % CALM_PHRASES.length];
    calmNote(ph[st.i % 8]); st.i++;
    st.h = setTimeout(loop, 520);
  };
  loop();
  return { mode: "calm", stop: () => { st.stopped = true; clearTimeout(st.h); } };
}
function stopAmbient() {
  if (!ambient) return;
  ambient.stop();
  ambient = null;
}
export function applyAmbient() {
  if (!audioCtx || S.muted) { stopAmbient(); return; }
  const want: "calm" | "drive" = S.screen === "game" ? "drive" : "calm";
  if (ambient && ambient.mode === want) return;
  stopAmbient();
  ambient = want === "drive" ? startDrive() : startCalm();
}
export function unlockAudio() { ensureAudio(); applyAmbient(); }

let alarmTimer: ReturnType<typeof setInterval> | undefined;
function klaxon() { beep(740, 150, "square", 0.045); setTimeout(() => beep(560, 150, "square", 0.045), 170); }
function startAlarm() { if (alarmTimer) return; klaxon(); alarmTimer = setInterval(klaxon, 950); }
function stopAlarm() { if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = undefined; } }

function playSound(kind: "completed" | "expired" | "nextLevel" | "gameOver" | "broke" | "slimed" | "eventStart" | "eventPassed" | "eventFailed") {
  if (kind === "completed") beep(660, 90, "square");
  else if (kind === "expired") beep(150, 220, "sawtooth");
  else if (kind === "nextLevel") { beep(523, 90); setTimeout(() => beep(784, 160), 110); }
  else if (kind === "broke") { sweep(320, 110, 180, "sawtooth", 0.07); noiseBurst(70, 0.05); }
  else if (kind === "slimed") { sweep(520, 150, 260, "sine", 0.06); setTimeout(() => noiseBurst(130, 0.035), 60); }
  else if (kind === "eventStart") { beep(420, 130, "square", 0.05); setTimeout(() => beep(560, 150, "square", 0.05), 150); setTimeout(() => beep(700, 170, "square", 0.05), 320); }
  else if (kind === "eventPassed") { beep(523, 120, "triangle", 0.07); setTimeout(() => beep(659, 120, "triangle", 0.07), 110); setTimeout(() => beep(784, 240, "triangle", 0.07), 230); }
  else if (kind === "eventFailed") { noiseBurst(320, 0.1); beep(170, 320, "sawtooth", 0.07); }
  else if (kind === "gameOver") { stopAlarm(); noiseBurst(500, 0.1); beep(300, 160, "sawtooth"); setTimeout(() => beep(130, 450, "sawtooth"), 150); }
}

export function openHelp() { S.showHelp = true; }
export function closeHelp() { S.showHelp = false; }

export function toggleMute() {
  S.muted = !S.muted;
  lsSet("klaxon_muted", S.muted ? "1" : "0");
  ensureAudio();
  if (S.muted) { stopAmbient(); stopAlarm(); }
  else { beep(880, 60); applyAmbient(); }
}

export function previewSound(kind: string) {
  ensureAudio();
  if (kind === "alarm") { if (alarmTimer) stopAlarm(); else startAlarm(); return; }
  playSound(kind as any);
}

export function me(): PlayerView | undefined {
  return S.players.find((p) => p.id === S.sessionId);
}

function currentName(): string { return S.name.trim().slice(0, 20) || "Player"; }

export function joinUrl(): string {
  return location.origin + location.pathname + "?r=" + S.code;
}

function pulse(kind: "good" | "bad") {
  S.flash = kind;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (S.flash = ""), 250);
  if (kind === "bad") {
    S.shake = true;
    clearTimeout(shakeTimer);
    shakeTimer = setTimeout(() => (S.shake = false), 450);
  }
}

function showBanner(text: string) {
  S.banner = text;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (S.banner = ""), 1500);
}

function snapshot() {
  const st = room?.state;
  if (!st) return;

  const prevLevel = S.level;
  const prevPhase = S.phase;

  S.phase = st.phase;
  S.level = st.level;
  S.health = st.health;
  S.deathLimit = st.deathLimit;
  S.startLevel = st.startLevel ?? 3;
  S.code = st.code ?? "";
  S.eventType = st.eventType ?? "";
  S.eventMs = st.eventMs ?? 0;

  const players: PlayerView[] = [];
  st.players.forEach((p: any) => {
    const panel: ControlView[] = [];
    p.panel.forEach((c: any) =>
      panel.push({
        id: c.id, kind: c.kind, label: c.label, value: c.value,
        min: c.min, max: c.max, options: [...c.options], w: c.w ?? 1, h: c.h ?? 1, hazard: c.hazard ?? "",
      })
    );
    players.push({
      id: p.id, name: p.name, host: p.host, ready: p.ready,
      connected: p.connected, instructionText: p.instructionText, panel,
      statCompleted: p.statCompleted ?? 0, statExpired: p.statExpired ?? 0, eventDone: p.eventDone ?? false,
      dbgTargetControlId: p.dbgTargetControlId ?? "", dbgTargetValue: p.dbgTargetValue ?? "",
    });
  });
  S.players = players;

  S.screen = st.phase === "over" ? "over" : st.phase === "playing" ? "game" : "lobby";

  // Level geschafft (aus dem autoritativen State abgeleitet)
  if (st.phase === "playing" && st.level > prevLevel && prevLevel >= 1) {
    showBanner("Sector " + st.level);
    playSound("nextLevel");
  }
  // Game Over
  if (st.phase === "over" && prevPhase !== "over") {
    playSound("gameOver");
  }
  if (st.phase === "playing" && prevPhase !== "playing") {
    S.feedbackSent = false;
  }
  if (st.phase === "playing" && (st.health - st.deathLimit) < 15) startAlarm(); else stopAlarm();
  applyAmbient();
}

async function bind(r: any) {
  room = r;
  reconToken = r.reconnectionToken ?? reconToken;
  S.roomId = r.roomId;
  S.sessionId = r.sessionId;
  r.onStateChange(() => snapshot());
  r.onMessage("feedbackAck", () => { S.feedbackSent = true; });
  const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };
  r.onMessage("debug:stats", (d: any) => { S.stats = d; });
  r.onMessage("evt", (e: any) => {
    if (e.type === "eventStart") { playSound("eventStart"); vib(80); }
    else if (e.type === "eventPassed") { S.eventResult = "passed"; playSound("eventPassed"); vib([60,40,60]); setTimeout(() => (S.eventResult = ""), 1300); }
    else if (e.type === "eventFailed") { S.eventResult = "failed"; playSound("eventFailed"); vib(320); setTimeout(() => (S.eventResult = ""), 1300); }
    if (e.type === "completed") { pulse("good"); playSound("completed"); }
    else if (e.type === "expired") { pulse("bad"); playSound("expired"); }
    else if (e.type === "broke") { pulse("bad"); playSound("broke"); }
    else if (e.type === "slimed") { pulse("bad"); playSound("slimed"); }
  });
  r.onLeave((code: number) => { handleLeave(code); });
  snapshot();
}

async function handleLeave(code: number) {
  room = null;
  if (code === 1000) { S.screen = "home"; return; } // sauberer Abschied
  S.reconnecting = true;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const r = await client!.reconnect(reconToken);
      await bind(r);
      S.reconnecting = false;
      return;
    } catch {
      await sleep(2000);
    }
  }
  S.reconnecting = false;
  S.error = "Connection lost.";
  S.screen = "home";
}

export function updateName(v: string) {
  S.name = v;
  lsSet("klaxon_name", v);
}
export function commitName() {
  const n = S.name.trim().slice(0, 20);
  if (room && n) room.send("setName", n);
}

export async function createGame() {
  ensureAudio();
  S.connecting = true; S.error = "";
  try {
    client ??= new Client(SERVER_URL);
    const newCode = genCode();
    await bind(await connectWithRetry(() => client!.create("spaceteam", { code: newCode, name: currentName() })));
  } catch (e: any) {
    S.error = e?.message ?? "Connection failed.";
  } finally {
    S.connecting = false;
  }
}

export async function joinGame(id: string) {
  ensureAudio();
  S.connecting = true; S.error = "";
  try {
    client ??= new Client(SERVER_URL);
    await bind(await connectWithRetry(() => client!.joinById(id)));
  } catch (e: any) {
    S.error = "Join failed: " + (e?.message ?? "room not found.");
  } finally {
    S.connecting = false;
  }
}

export function setDifficulty(level: number) { room?.send("setDifficulty", level); }
export function sendFeedback(text: string) { room?.send("feedback", text); }
export async function joinByCode(code: string) {
  ensureAudio();
  const cc = code.trim().toUpperCase();
  S.connecting = true; S.error = "";
  try {
    client ??= new Client(SERVER_URL);
    try {
      await bind(await connectWithRetry(() => client!.join("spaceteam", { code: cc, name: currentName() })));
    } catch {
      S.error = "No game found for code " + cc + ".";
    }
  } catch (e: any) {
    S.error = "Join failed: " + (e?.message ?? "");
  } finally {
    S.connecting = false;
  }
}
export function ready(v: boolean) { room?.send("ready", v); if (v && !S.motionOk) enableMotion(); }
export function start() { room?.send("start"); }
export function playAgain() { room?.send("playAgain"); }
export function clearHazard(controlId: string) { room?.send("clearHazard", controlId); }
export function sendEventAction() { room?.send("eventAction"); }
export function kick(id: string) { room?.send("kick", id); }
export function dbg(msg: string, payload?: any) { room?.send(msg, payload); }
export function initDebug() {
  try {
    const url = new URLSearchParams(location.search).has("debug");
    const saved = localStorage.getItem("klaxon_debug") === "1";
    S.debug = url || saved;
    if (url) localStorage.setItem("klaxon_debug", "1");
  } catch { /* ignore */ }
}
export function setDebug(on: boolean) {
  S.debug = on;
  try { localStorage.setItem("klaxon_debug", on ? "1" : "0"); } catch { /* ignore */ }
}
export function initMotion() {
  try {
    const DM: any = (window as any).DeviceMotionEvent;
    if (DM && typeof DM.requestPermission !== "function") S.motionOk = true;
  } catch { /* ignore */ }
}
export async function enableMotion() {
  try {
    const DM: any = (window as any).DeviceMotionEvent;
    const DO: any = (window as any).DeviceOrientationEvent;
    let ok = true;
    if (DM && typeof DM.requestPermission === "function") ok = (await DM.requestPermission()) === "granted";
    if (DO && typeof DO.requestPermission === "function") { try { await DO.requestPermission(); } catch {} }
    S.motionOk = ok;
  } catch { S.motionOk = false; }
}
export function setControl(controlId: string, value: string) {
  room?.send("setControl", { controlId, value });
}
```

## Datei: `spaceteam/packages/client/src/lib/Debug.svelte`

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { S, me, dbg, previewSound, toggleMute } from "./store.svelte";

  let open = $state(false);
  let reveal = $state(false);
  let paused = $state(false);
  let statsTimer: ReturnType<typeof setInterval> | undefined;
  let sndAlarm = $state(false);
  const ONESHOTS = ["completed", "expired", "nextLevel", "broke", "slimed", "eventStart", "eventPassed", "eventFailed", "gameOver"];

  const EVENTS = ["meteor", "blackhole", "brace", "surge", "freeze", "wormhole"];
  let mine = $derived(me());

  function refreshStats() { dbg("debug:stats"); }
  onMount(() => { refreshStats(); statsTimer = setInterval(() => { if (open) refreshStats(); }, 3000); });
  onDestroy(() => clearInterval(statsTimer));

  function toggleReveal() { reveal = !reveal; dbg("debug:reveal", reveal); }
  function togglePause() { paused = !paused; dbg("debug:pause", paused); }

  // Antwort auf mein aktuelles Kommando (nur wenn reveal an)
  let answer = $derived.by(() => {
    const id = mine?.dbgTargetControlId;
    if (!id) return "";
    const c = mine?.panel.find((x) => x.id === id);
    const label = c ? c.label : id;
    const v = mine?.dbgTargetValue;
    if (c?.kind === "toggle") return label + " -> " + (v === "true" ? "ON" : "OFF");
    if (c?.kind === "button") return label + " -> PRESS";
    return label + " -> " + v;
  });

  function fmtUptime(sec: number) {
    if (sec == null) return "-";
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + "h " : "") + (m ? m + "m " : "") + s + "s";
  }
</script>

{#if !open}
  <button class="dbg-fab" onclick={() => { open = true; refreshStats(); }}>DEBUG</button>
{:else}
  <div class="dbg-panel">
    <div class="dbg-head">
      <span>DEBUG</span>
      <button class="dbg-x" onclick={() => (open = false)}>close</button>
    </div>

    {#if !mine?.host}
      <p class="dbg-note">Only the host can trigger debug actions. (Stats still shown.)</p>
    {/if}

    <div class="dbg-sec">
      <div class="dbg-t">Server stats</div>
      {#if S.stats}
        {#if S.stats.error}
          <div class="dbg-note">error: {S.stats.error}</div>
        {:else}
          <div class="dbg-grid">
            <span>Rooms</span><b>{S.stats.rooms}</b>
            <span>Players</span><b>{S.stats.players}</b>
            <span>Uptime</span><b>{fmtUptime(S.stats.uptime)}</b>
            <span>RSS</span><b>{S.stats.rssMB} MB</b>
            <span>Heap</span><b>{S.stats.heapMB} MB</b>
          </div>
        {/if}
      {:else}
        <div class="dbg-note">loading...</div>
      {/if}
      <button class="dbg-b" onclick={refreshStats}>Refresh</button>
    </div>

    <div class="dbg-sec">
      <div class="dbg-t">Sounds</div>
      <div class="dbg-row">
        <button class="dbg-b" class:on={!S.muted} onclick={toggleMute}>{S.muted ? "Muted" : "Sound on"}</button>
        <button class="dbg-b" class:on={sndAlarm} onclick={() => { sndAlarm = !sndAlarm; previewSound("alarm"); }}>Alarm</button>
      </div>
      <div class="dbg-row" style="margin-top:5px">
        {#each ONESHOTS as k}<button class="dbg-b" onclick={() => previewSound(k)}>{k}</button>{/each}
      </div>
    </div>

    {#if mine?.host}
      <div class="dbg-sec">
        <div class="dbg-t">Trigger event</div>
        <div class="dbg-row">
          {#each EVENTS as e}<button class="dbg-b" onclick={() => dbg("debug:event", e)}>{e}</button>{/each}
        </div>
      </div>

      <div class="dbg-sec">
        <div class="dbg-t">Hazards</div>
        <div class="dbg-row">
          <button class="dbg-b" onclick={() => dbg("debug:hazard", "broken")}>Break</button>
          <button class="dbg-b" onclick={() => dbg("debug:hazard", "slimed")}>Slime</button>
          <button class="dbg-b" onclick={() => dbg("debug:clearHazards")}>Clear</button>
        </div>
      </div>

      <div class="dbg-sec">
        <div class="dbg-t">Health / flow</div>
        <div class="dbg-row">
          <button class="dbg-b" onclick={() => dbg("debug:health", -20)}>-20 hp</button>
          <button class="dbg-b" onclick={() => dbg("debug:health", 20)}>+20 hp</button>
          <button class="dbg-b" onclick={() => dbg("debug:nextLevel")}>Next sector</button>
          <button class="dbg-b" onclick={() => dbg("debug:gameOver")}>Game over</button>
        </div>
      </div>

      <div class="dbg-sec">
        <div class="dbg-t">Solve / start</div>
        <div class="dbg-row">
          <button class="dbg-b" onclick={() => dbg("debug:solve", false)}>Solve mine</button>
          <button class="dbg-b" onclick={() => dbg("debug:solve", true)}>Solve all</button>
          <button class="dbg-b" onclick={() => dbg("debug:forceStart")}>Force start</button>
        </div>
      </div>

      <div class="dbg-sec">
        <div class="dbg-t">Toggles</div>
        <div class="dbg-row">
          <button class="dbg-b" class:on={reveal} onclick={toggleReveal}>Reveal answers</button>
          <button class="dbg-b" class:on={paused} onclick={togglePause}>Pause</button>
        </div>
        {#if reveal && answer}<div class="dbg-answer">Your command: {answer}</div>{/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .dbg-fab { position: fixed; right: 8px; bottom: 8px; z-index: 60; font-family: ui-monospace, Menlo, monospace; font-size: 0.7rem;
    background: #2a1030; color: #e9b7ff; border: 1px solid #7a3d94; border-radius: 8px; padding: 6px 9px; opacity: 0.85; touch-action: manipulation; }
  .dbg-panel { position: fixed; right: 8px; bottom: 8px; z-index: 60; width: min(320px, 92vw); max-height: 80dvh; overflow: auto;
    background: rgba(20,10,26,0.97); border: 1px solid #7a3d94; border-radius: 12px; padding: 10px; color: #f0e6f6;
    font-family: ui-monospace, Menlo, monospace; font-size: 0.72rem; box-shadow: 0 6px 24px rgba(0,0,0,0.5); }
  .dbg-head { display: flex; justify-content: space-between; align-items: center; font-weight: 700; letter-spacing: 2px; color: #e9b7ff; margin-bottom: 6px; }
  .dbg-x { background: transparent; border: 1px solid #7a3d94; color: #e9b7ff; border-radius: 6px; padding: 2px 8px; touch-action: manipulation; }
  .dbg-note { color: #b79ac6; margin: 2px 0; }
  .dbg-sec { border-top: 1px solid #3d2247; padding: 7px 0 3px; }
  .dbg-t { color: #c98fe0; margin-bottom: 5px; letter-spacing: 1px; }
  .dbg-row { display: flex; flex-wrap: wrap; gap: 5px; }
  .dbg-b { background: #34184000; border: 1px solid #7a3d94; color: #f0e6f6; border-radius: 7px; padding: 6px 8px; cursor: pointer; touch-action: manipulation; }
  .dbg-b:active { transform: translateY(1px); }
  .dbg-b.on { background: #6a2b86; border-color: #b06fd0; }
  .dbg-grid { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin-bottom: 6px; }
  .dbg-grid b { justify-self: end; }
  .dbg-answer { margin-top: 6px; color: #9be06a; }
</style>
```

## Datei: `spaceteam/packages/client/src/lib/EventOverlay.svelte`

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { S, sendEventAction, enableMotion } from "./store.svelte";

  type Mode = "tap" | "hold" | "freeze";
  const INFO: Record<string, { title: string; action: string; hint: string; mode: Mode; gesture?: "shake" | "orient" }> = {
    meteor:    { title: "METEOR SHOWER", action: "SHAKE!", hint: "Shake your phone hard", mode: "tap", gesture: "shake" },
    blackhole: { title: "BLACK HOLE", action: "FLIP YOUR PHONE!", hint: "Turn it over / on its side", mode: "tap", gesture: "orient" },
    brace:     { title: "BRACE!", action: "TAP FAST!", hint: "", mode: "tap" },
    surge:     { title: "POWER SURGE", action: "HOLD!", hint: "Press and hold", mode: "hold" },
    freeze:    { title: "DECOMPRESSION", action: "DO NOT TOUCH!", hint: "Hands off the screen", mode: "freeze" },
    wormhole:  { title: "WORMHOLE", action: "STABILIZE", hint: "Panels swapped - you now control someone else s board!", mode: "tap" },
  };
  let info = $derived(INFO[S.eventType] ?? { title: S.eventType, action: "GO!", hint: "", mode: "tap" as Mode });

  let didIt = $state(false);
  let taps = $state(0);
  let holdProg = $state(0);
  let secs = $state(Math.ceil((S.eventMs || 6000) / 1000));
  let timer: ReturnType<typeof setInterval>;
  let shakeCount = 0, holding = false, holdRaf = 0;

  function complete() { if (didIt) return; didIt = true; sendEventAction(); }
  function onTap() { if (didIt) return; taps++; if (taps >= 3) complete(); }
  function holdStart(e: PointerEvent) {
    if (didIt) return; e.preventDefault(); holding = true; const t0 = performance.now();
    const step = () => { if (!holding) return; holdProg = Math.min(1, (performance.now() - t0) / 2000);
      if (holdProg >= 1) { holding = false; complete(); return; } holdRaf = requestAnimationFrame(step); };
    holdRaf = requestAnimationFrame(step);
  }
  function holdEnd() { holding = false; holdProg = 0; cancelAnimationFrame(holdRaf); }
  function onFreezeTouch() { sendEventAction(); } // beruehren = Fehlschlag

  function onMotion(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity || (e as any).acceleration; if (!a) return;
    if (Math.hypot(a.x || 0, a.y || 0, a.z || 0) > 22) { shakeCount++; if (shakeCount >= 3) complete(); }
  }
  function onOrient(e: DeviceOrientationEvent) {
    if (Math.abs(e.gamma ?? 0) > 55 || Math.abs(e.beta ?? 0) > 130) complete();
  }
  onMount(() => {
    timer = setInterval(() => { secs = Math.max(0, secs - 1); }, 1000);
    if (info.gesture === "shake") window.addEventListener("devicemotion", onMotion);
    if (info.gesture === "orient") window.addEventListener("deviceorientation", onOrient);
  });
  onDestroy(() => {
    clearInterval(timer);
    window.removeEventListener("devicemotion", onMotion);
    window.removeEventListener("deviceorientation", onOrient);
  });
  let doneCount = $derived(S.players.filter((p) => p.eventDone).length);
</script>

<div class="event-overlay" class:freeze={info.mode === "freeze"}
     onpointerdown={info.mode === "freeze" ? onFreezeTouch : undefined}>
  <div class="ev-box">
    <div class="ev-title">{info.title}</div>
    <div class="ev-action">{info.action}</div>

    {#if info.mode === "freeze"}
      <div class="ev-hint">Do not tap anything until the timer ends</div>
    {:else if didIt}
      <div class="ev-waiting">Done - waiting for crew {doneCount}/{S.players.length}</div>
    {:else if info.mode === "hold"}
      <button class="btn wide primary" onpointerdown={holdStart} onpointerup={holdEnd} onpointerleave={holdEnd} onpointercancel={holdEnd}>HOLD</button>
      <div class="ev-bar"><div class="ev-fill" style="width:{holdProg * 100}%"></div></div>
    {:else}
      <button class="btn wide primary tapbtn" onpointerdown={(e) => { e.preventDefault(); onTap(); }}>
        {S.eventType === "brace" || S.eventType === "wormhole" ? "TAP! (" + taps + "/3)" : "Can't move? TAP (" + taps + "/3)"}
      </button>
      {#if info.hint}<div class="ev-hint">{info.hint}</div>{/if}
      {#if !S.motionOk && info.gesture}<button class="helplink" onclick={enableMotion}>Enable shake &amp; tilt</button>{/if}
    {/if}

    <div class="ev-count">{secs}s</div>
  </div>
</div>

<style>
  .event-overlay { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 22px; background: rgba(60,10,12,0.9); }
  .event-overlay.freeze { background: rgba(10,30,50,0.92); }
  .ev-box { width: 100%; max-width: 420px; text-align: center; }
  .ev-title { font-family: ui-monospace, Menlo, monospace; color: #ffd9d2; letter-spacing: 3px; font-size: 1rem; }
  .event-overlay.freeze .ev-title { color: #cfe6ff; }
  .ev-action { font-family: ui-monospace, Menlo, monospace; color: var(--danger); font-weight: 700; font-size: 2.2rem; margin: 8px 0 20px; text-shadow: 0 0 14px rgba(229,72,77,0.7); }
  .event-overlay.freeze .ev-action { color: #7cc4e8; text-shadow: 0 0 14px rgba(124,196,232,0.7); }
  .ev-bar { height: 8px; margin-top: 12px; background: rgba(0,0,0,0.5); border-radius: 4px; overflow: hidden; }
  .ev-fill { height: 100%; background: var(--amber); }
  .ev-hint { color: var(--muted); margin-top: 10px; font-size: 0.85rem; }
  .ev-waiting { color: var(--ok); font-weight: 600; }
  .ev-count { margin-top: 18px; font-family: ui-monospace, Menlo, monospace; font-size: 1.6rem; color: var(--amber); }
  @media (prefers-reduced-motion: no-preference) { .ev-action { animation: evpulse 0.6s ease-in-out infinite alternate; } }
  @keyframes evpulse { from { transform: scale(1); } to { transform: scale(1.08); } }
</style>
```

## Datei: `spaceteam/packages/client/src/lib/Control.svelte`

```svelte
<script lang="ts">
  import { setControl, clearHazard, type ControlView } from "./store.svelte";
  let { control }: { control: ControlView } = $props();

  const press = () => setControl(control.id, "");
  const flip = () => setControl(control.id, control.value === "true" ? "false" : "true");
  const onSlide = (e: Event) => setControl(control.id, (e.target as HTMLInputElement).value);
  const choose = (opt: string) => setControl(control.id, opt);

  let ticks = $derived(
    control.kind === "slider"
      ? Array.from({ length: (control.max ?? 0) - (control.min ?? 0) + 1 }, (_, i) => (control.min ?? 0) + i)
      : []
  );

  // Hazard "broken": halten zum Reparieren
  let holdProg = $state(0);
  let holding = false; let raf = 0;
  const REPAIR_MS = 1500;
  function holdStart(e: PointerEvent) {
    if (control.hazard !== "broken") return; e.preventDefault(); holding = true;
    const t0 = performance.now();
    const step = () => {
      if (!holding) return;
      holdProg = Math.min(1, (performance.now() - t0) / REPAIR_MS);
      if (holdProg >= 1) { holding = false; holdProg = 0; clearHazard(control.id); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function holdEnd() { holding = false; holdProg = 0; cancelAnimationFrame(raf); }

  // Hazard "slimed": wegwischen (Swipe)
  let wipeProg = $state(0);
  let wiping = false; let lx = 0, ly = 0;
  const WIPE_PX = 240;
  function wipeStart(e: PointerEvent) {
    if (control.hazard !== "slimed") return; e.preventDefault(); wiping = true; lx = e.clientX; ly = e.clientY;
  }
  function wipeMove(e: PointerEvent) {
    if (!wiping) return;
    wipeProg = Math.min(1, wipeProg + Math.hypot(e.clientX - lx, e.clientY - ly) / WIPE_PX);
    lx = e.clientX; ly = e.clientY;
    if (wipeProg >= 1) { wiping = false; wipeProg = 0; clearHazard(control.id); }
  }
  function wipeEnd() { wiping = false; wipeProg = 0; }
</script>

<div class="control kind-{control.kind}" class:hazarded={!!control.hazard}
     style="grid-column: span {control.w}; grid-row: span {control.h};">
  <div class="face">
    {#if control.kind === "button"}
      <button class="hw press" onclick={press}>PRESS</button>
    {:else if control.kind === "toggle"}
      <button class="switch" class:on={control.value === "true"} onclick={flip} aria-label="toggle"><span class="knob"></span></button>
    {:else if control.kind === "slider"}
      <div class="ticks">{#each ticks as t}<span>{t}</span>{/each}</div>
      <input class="range" type="range" min={control.min} max={control.max} step="1" value={control.value} oninput={onSlide} />
      <div class="readout">{control.value}</div>
    {:else if control.kind === "selector"}
      <div class="opts">
        {#each control.options as opt}
          <button class="hw opt" class:on={control.value === opt} onclick={() => choose(opt)}>{opt}</button>
        {/each}
      </div>
    {/if}
  </div>
  <div class="name">{control.label}</div>

  {#if control.hazard === "broken"}
    <div class="hz hz-broken" onpointerdown={holdStart} onpointerup={holdEnd} onpointerleave={holdEnd} onpointercancel={holdEnd}>
      <div class="hz-label">HOLD<br />TO FIX</div>
      <div class="hz-bar"><div class="hz-fill" style="width:{holdProg * 100}%"></div></div>
    </div>
  {:else if control.hazard === "slimed"}
    <div class="hz hz-slimed" onpointerdown={wipeStart} onpointermove={wipeMove} onpointerup={wipeEnd} onpointerleave={wipeEnd} onpointercancel={wipeEnd}>
      <div class="hz-label">ALIEN GOO<br />WIPE IT OFF</div>
      <div class="hz-bar"><div class="hz-fill green" style="width:{wipeProg * 100}%"></div></div>
    </div>
  {/if}
</div>

<style>
  .control {
    position: relative; height: 100%; min-height: 0; overflow: hidden;
    display: flex; flex-direction: column; justify-content: center; gap: 5px;
    padding: 7px 8px 6px; border-radius: 8px;
    background: linear-gradient(180deg, #1a3d38 0%, #12302c 100%);
    border: 1px solid var(--line); border-top-width: 3px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -6px 12px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.4);
  }
  .control::after {
    content: ""; position: absolute; inset: 4px; pointer-events: none; border-radius: 6px;
    background:
      radial-gradient(circle at 2px 2px, rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at calc(100% - 2px) 2px, rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at 2px calc(100% - 2px), rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at calc(100% - 2px) calc(100% - 2px), rgba(255,255,255,0.22) 0.5px, transparent 1.6px);
  }
  .kind-button   { border-top-color: var(--danger); }
  .kind-toggle   { border-top-color: var(--ok); }
  .kind-slider   { border-top-color: var(--amber); }
  .kind-selector { border-top-color: #7cc4e8; }
  .control.hazarded { filter: brightness(0.85); }

  .face { display: flex; flex-direction: column; justify-content: center; gap: 5px; min-height: 0; }
  .name {
    font-size: 0.68rem; color: var(--muted); text-align: center; line-height: 1.1; letter-spacing: 0.3px;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .hw {
    appearance: none; cursor: pointer; width: 100%;
    border: 1px solid var(--line); background: linear-gradient(180deg,#25514a,#1a3d38); color: var(--ink);
    border-radius: 7px; padding: 0.5em; font-weight: 700; font-size: 0.9rem;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.4);
  }
  .hw:active { transform: translateY(1px); }
  .hw.on { background: linear-gradient(180deg,#ffc24d,#f5a623); color: var(--amber-ink); border-color: var(--amber); box-shadow: 0 0 12px rgba(245,166,35,0.6); }
  .press { color: #fff; border: 1px solid #6b2020; border-radius: 999px; aspect-ratio: 1; max-width: 68px; margin: 0 auto; font-size: 0.8rem;
    background: radial-gradient(circle at 50% 32%, #ff7a7a 0%, #d23636 55%, #8f1c1c 100%);
    box-shadow: inset 0 -4px 8px rgba(0,0,0,0.5), inset 0 3px 6px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.5); }
  .press:active { transform: translateY(1px); box-shadow: inset 0 2px 8px rgba(0,0,0,0.6), 0 0 14px rgba(229,72,77,0.7); }

  /* Toggle als Kippschalter */
  .switch { position: relative; height: 42px; width: 58px; margin: 2px auto; padding: 0; border-radius: 22px; cursor: pointer;
    background: linear-gradient(180deg,#0c1a19,#14302c); border: 1px solid var(--line); box-shadow: inset 0 2px 6px rgba(0,0,0,0.6); }
  .switch .knob { position: absolute; left: 5px; right: 5px; height: 16px; top: 22px; border-radius: 8px;
    background: linear-gradient(180deg,#95a5a2,#4a5b58); box-shadow: 0 1px 2px rgba(0,0,0,0.6); transition: top 0.12s ease, background 0.12s ease; }
  .switch.on { border-color: var(--amber); box-shadow: inset 0 2px 6px rgba(0,0,0,0.6), 0 0 12px rgba(245,166,35,0.5); }
  .switch.on .knob { top: 4px; background: linear-gradient(180deg,#ffd98a,#f5a623); }

  /* Slider mit Ticks */
  .ticks { display: flex; justify-content: space-between; padding: 0 2px; font-family: ui-monospace, Menlo, monospace; font-size: 0.6rem; color: var(--muted); }
  .range { width: 100%; accent-color: var(--amber); }
  .readout {
    align-self: center; font-family: ui-monospace, Menlo, monospace; color: var(--amber); font-size: 1.05rem;
    background: #0a1615; border: 1px solid var(--line); border-radius: 4px; padding: 1px 10px;
    box-shadow: inset 0 0 8px rgba(0,0,0,0.6); text-shadow: 0 0 6px rgba(245,166,35,0.6);
  }
  .opts { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .opts .hw { width: auto; flex: 1 1 42%; padding: 0.4em; font-size: 0.8rem;
    background: #0a1615; color: var(--muted); border: 1px solid var(--line); box-shadow: inset 0 0 6px rgba(0,0,0,0.6); }
  .opts .hw.on { background: linear-gradient(180deg,#ffc24d,#f5a623); color: var(--amber-ink); border-color: var(--amber); box-shadow: 0 0 12px rgba(245,166,35,0.6); }

  /* Hazard-Overlays */
  .hz { position: absolute; inset: 0; z-index: 3; touch-action: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; border-radius: 8px; }
  .hz-label { font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-size: 0.82rem; text-align: center; line-height: 1.1; color: #fff; background: rgba(0,0,0,0.72); padding: 5px 9px; border-radius: 7px; box-shadow: 0 1px 3px rgba(0,0,0,0.6); }
  .hz-bar { width: 72%; height: 6px; background: rgba(0,0,0,0.55); border-radius: 3px; overflow: hidden; }
  .hz-fill { height: 100%; background: var(--ok); }
  .hz-fill.green { background: #9be06a; }
  .hz-broken { border: 2px solid var(--danger);
    background: repeating-linear-gradient(45deg, rgba(229,72,77,0.18), rgba(229,72,77,0.18) 8px, rgba(0,0,0,0.4) 8px, rgba(0,0,0,0.4) 16px); }
  .hz-slimed { border: 2px solid #6fae3f;
    background: radial-gradient(circle at 28% 38%, rgba(140,215,95,0.65), transparent 42%), radial-gradient(circle at 72% 62%, rgba(95,185,70,0.6), transparent 46%), rgba(55,120,40,0.55); }
</style>
```

## Datei: `spaceteam/packages/client/src/lib/Home.svelte`

```svelte
<script lang="ts">
  import { S, createGame, joinByCode, updateName, openHelp, setDebug, VERSION, REPO_URL } from "./store.svelte";
  let code = $state("");

  let verTaps = 0; let verTimer: ReturnType<typeof setTimeout>;
  function tapVersion() {
    if (S.debug) { setDebug(false); verTaps = 0; alert("Debug OFF"); return; }
    verTaps++; clearTimeout(verTimer); verTimer = setTimeout(() => (verTaps = 0), 1500);
    if (verTaps >= 5) { verTaps = 0; setDebug(true); alert("Debug ON"); }
  }
</script>

<div class="home">
  <h1>Klaxon</h1>
  <p class="tagline">A cooperative shouting game for the same room. Open the page, no download.</p>

  <label class="field">
    <span>Your name</span>
    <input class="input name" maxlength="20" placeholder="Your name"
           value={S.name} oninput={(e) => updateName((e.target as HTMLInputElement).value)} />
  </label>

  <button class="btn wide primary" disabled={S.connecting} onclick={createGame}>
    {S.connecting ? "Starting..." : "Start a new game"}
  </button>

  <div class="or">or join with a code</div>
  <div class="join-row">
    <input class="input" placeholder="Room code" maxlength="6" autocapitalize="characters" autocorrect="off" spellcheck="false" style="text-transform:uppercase" value={code} oninput={(e) => (code = (e.target as HTMLInputElement).value.toUpperCase())} />
    <button class="btn" disabled={!code || S.connecting} onclick={() => joinByCode(code)}>Join</button>
  </div>

  {#if S.error}<p class="error">{S.error}</p>{/if}

  <button class="btn wide" onclick={openHelp}>How to play</button>

  <footer class="version"><button class="verbtn" onclick={tapVersion}>Klaxon v{VERSION}</button> &middot; <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a>{#if S.debug} &middot; <span class="dbgon">debug</span>{/if}</footer>
</div>
<style>
  .verbtn { background: none; border: none; color: inherit; font: inherit; padding: 0; cursor: default; }
  .dbgon { color: #c98fe0; }
</style>```

## Datei: `spaceteam/packages/client/src/lib/Lobby.svelte`

```svelte
<script lang="ts">
  import QRCode from "qrcode";
  import { S, me, ready, start, setDifficulty, joinUrl, updateName, commitName, openHelp, enableMotion, kick, VERSION, REPO_URL } from "./store.svelte";

  let qr = $state("");
  let mine = $derived(me());
  let canStart = $derived(S.players.length >= 2 && S.players.every((p) => p.ready));

  const DIFFS = [
    { label: "Casual", level: 1 },
    { label: "Normal", level: 3 },
    { label: "Hard", level: 5 },
    { label: "Insane", level: 8 },
  ];
  let diffLabel = $derived(DIFFS.find((d) => d.level === S.startLevel)?.label ?? ("Sector " + S.startLevel));

  $effect(() => {
    if (S.roomId) {
      QRCode.toDataURL(joinUrl(), { margin: 1, width: 220 })
        .then((d) => (qr = d))
        .catch(() => (qr = ""));
    }
  });

  let copied = $state(false);
  let copyT: ReturnType<typeof setTimeout>;
  async function copyLink() {
    const text = joinUrl();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      } catch { /* ignore */ }
    }
    copied = true; clearTimeout(copyT); copyT = setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="lobby">
  <h1>Ready room</h1>
  <p class="hint">Others join by scanning the code - same room, no download.</p>
  <button class="helplink" onclick={openHelp}>How to play</button>

  <div class="join-card">
    <div class="code">{S.code}</div>
    {#if qr}<img class="qr" src={qr} alt="Scan to join" width="220" height="220" />{/if}
    <button class="url" onclick={copyLink}>{copied ? "Link copied!" : joinUrl()}</button>
    <div class="urlhint">{copied ? "" : "tap link to copy"}</div>
  </div>

  <label class="field">
    <span>Your name</span>
    <input class="input name" maxlength="20" placeholder="Your name"
           value={S.name}
           oninput={(e) => updateName((e.target as HTMLInputElement).value)}
           onchange={commitName} onblur={commitName} />
  </label>

  <ul class="players">
    {#each S.players as p (p.id)}
      <li class:ready={p.ready} class:offline={!p.connected}>
        <span>{p.name}{p.host ? " - host" : ""}{p.id === S.sessionId ? " - you" : ""}</span>
        <span class="pstatus">
          {#if !p.connected}offline{:else}{p.ready ? "ready" : "waiting"}{/if}
          {#if mine?.host && p.id !== S.sessionId}
            <button class="kick" onclick={() => kick(p.id)} aria-label="remove player">x</button>
          {/if}
        </span>
      </li>
    {/each}
  </ul>

  <div class="difficulty">
    <span class="diff-label">Difficulty: <b>{diffLabel}</b></span>
    {#if mine?.host}
      <div class="diff-opts">
        {#each DIFFS as d}
          <button class="btn diff" class:on={S.startLevel === d.level} onclick={() => setDifficulty(d.level)}>{d.label}</button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="difficulty">
    <span class="diff-label">Motion controls (shake / tilt)</span>
    <button class="btn diff" class:on={S.motionOk} onclick={enableMotion} disabled={S.motionOk}>
      {S.motionOk ? "On" : "Enable"}
    </button>
  </div>

  <button class="btn wide" onclick={() => ready(!mine?.ready)}>
    {mine?.ready ? "Not ready" : "I am ready"}
  </button>

  {#if mine?.host}
    <button class="btn wide primary" disabled={!canStart} onclick={start}>Start game</button>
    {#if !canStart}<p class="hint">Need at least 2 players, everyone ready.</p>{/if}
  {/if}
  <footer class="version">Klaxon v{VERSION} &middot; <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a></footer>
</div>
```

## Datei: `spaceteam/packages/client/src/lib/Game.svelte`

```svelte
<script lang="ts">
  import { difficultyForLevel } from "@spaceteam/shared";
  import { S, me, toggleMute } from "./store.svelte";
  import Control from "./Control.svelte";

  let mine = $derived(me());
  let marginPct = $derived(Math.max(0, Math.min(100, ((S.health - S.deathLimit) / Math.max(1, 100 - S.deathLimit)) * 100)));
  let danger = $derived(S.health - S.deathLimit < 20);
  let cmdMs = $derived(difficultyForLevel(S.level).instructionTimeMs);
</script>

<div class="game" class:flash-good={S.flash === "good"} class:flash-bad={S.flash === "bad"} class:shake={S.shake}>
  <header class="hud">
    <span class="sector">SECTOR {S.level}</span>
    <div class="bar" class:danger>
      <div class="health" style="width:{marginPct}%"></div>
    </div>
    <button class="mute" onclick={toggleMute} aria-label="Toggle sound">{S.muted ? "unmute" : "mute"}</button>
  </header>

  <section class="command">
    {#key mine?.instructionText}
      <div class="command-inner" class:pulse={S.flash === "good"}>{mine?.instructionText ?? "Stand by..."}</div>
      <div class="timer"><div class="timer-fill" style="animation-duration: {cmdMs}ms"></div></div>
    {/key}
  </section>

  <section class="panel">
    {#each mine?.panel ?? [] as c (c.id)}
      <Control control={c} />
    {/each}
  </section>

  {#if S.banner}<div class="banner"><span>{S.banner}</span></div>{/if}
</div>

<style>
  .game {
    height: 100vh; height: 100dvh;
    max-width: 720px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 8px;
    padding: 8px 10px 10px; overflow: hidden;
  }
  .game.flash-good { box-shadow: inset 0 0 40px rgba(87,192,138,0.35); }
  .game.flash-bad { box-shadow: inset 0 0 70px rgba(229,72,77,0.55); }

  .hud { flex: none; display: flex; align-items: center; gap: 10px; }
  .sector { font-family: ui-monospace, Menlo, monospace; color: var(--muted); font-size: 0.8rem; letter-spacing: 1px; white-space: nowrap; }
  .bar { position: relative; flex: 1; height: 16px; border-radius: 8px; background: #0a1615; border: 1px solid var(--line); overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.6); }
  .health { position: absolute; inset: 0 auto 0 0; background: linear-gradient(180deg,#6fe0a8,#3f9e6f); transition: width 0.25s ease; }
  .bar.danger .health { background: linear-gradient(180deg,#ff7a7f,#d13a3a); }
  .mute { flex: none; appearance: none; border: 1px solid var(--line); background: var(--panel-2); color: var(--muted); border-radius: 8px; padding: 0.3em 0.6em; font-size: 0.75rem; cursor: pointer; }

  .command {
    flex: none; text-align: center; padding: 12px 14px 10px;
    background: linear-gradient(180deg,#123230,#0e2420);
    border: 1px solid var(--amber); border-radius: 10px;
    box-shadow: inset 0 0 22px rgba(245,166,35,0.12), 0 2px 6px rgba(0,0,0,0.4);
    position: relative; overflow: hidden;
  }
  .command::after { content:""; position:absolute; inset:0; pointer-events:none; border-radius:10px; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.13) 0 1px, transparent 1px 3px); }
  .command-inner { font-family: ui-monospace, Menlo, monospace; font-size: 1.35rem; line-height: 1.2; color: var(--amber); font-weight: 700; text-shadow: 0 0 8px rgba(245,166,35,0.45); }
  .command-inner::before { content: "\25B6\00a0"; opacity: 0.85; }
  .timer { height: 4px; margin-top: 10px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
  .timer-fill { height: 100%; background: var(--amber); transform-origin: left center; transform: scaleX(1); box-shadow: 0 0 8px rgba(245,166,35,0.6); }

  .panel { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); grid-auto-rows: minmax(0, 1fr); grid-auto-flow: row dense; gap: 6px;
    padding: 5px; border-radius: 10px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2));
    box-shadow: inset 0 0 0 1px var(--line), inset 0 2px 10px rgba(0,0,0,0.4); }
  @media (min-width: 560px) { .panel { grid-template-columns: repeat(3, minmax(0,1fr)); } }
  @media (min-width: 820px) { .panel { grid-template-columns: repeat(4, minmax(0,1fr)); } }

  .banner { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 20; }
  .banner span { font-family: ui-monospace, Menlo, monospace; font-size: 2rem; font-weight: 700; color: var(--amber); background: rgba(14,28,27,0.9); border: 1px solid var(--amber); padding: 0.5em 1em; border-radius: 12px; letter-spacing: 2px; text-shadow: 0 0 10px rgba(245,166,35,0.5); }

  @media (prefers-reduced-motion: no-preference) {
    .game.shake { animation: shake 0.4s ease; }
    .banner span { animation: bannerpop 0.3s ease; }
    .timer-fill { animation-name: drain; animation-timing-function: linear; animation-fill-mode: forwards; }
  }
  @keyframes shake { 10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(4px)} 30%,50%,70%{transform:translateX(-9px)} 40%,60%{transform:translateX(9px)} }
  @keyframes bannerpop { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes drain { from{transform:scaleX(1)} to{transform:scaleX(0)} }
</style>
```

## Datei: `spaceteam/packages/client/src/lib/GameOver.svelte`

```svelte
<script lang="ts">
  import { S, me, playAgain, sendFeedback } from "./store.svelte";
  let mine = $derived(me());

  const DIFF_NAMES: Record<number, string> = { 1: "Casual", 3: "Normal", 5: "Hard", 8: "Insane" };
  let diffName = $derived(DIFF_NAMES[S.startLevel] ?? ("Sector " + S.startLevel));

  let players = $derived([...S.players].sort((a, b) => b.statCompleted - a.statCompleted));
  let totalCompleted = $derived(players.reduce((a, p) => a + p.statCompleted, 0));
  let mvp = $derived(players.reduce((b: any, p) => (p.statCompleted > (b?.statCompleted ?? -1) ? p : b), null));
  let ignored = $derived(players.reduce((b: any, p) => (p.statExpired > (b?.statExpired ?? 0) ? p : b), null));

  let fb = $state("");
  const submit = () => { const t = fb.trim(); if (t) sendFeedback(t); };
</script>

<div class="over">
  <h1>Game over</h1>
  <p class="tagline">Reached <b>Sector {S.level}</b> on <b>{diffName}</b>.</p>

  <div class="stats">
    <div class="big">{totalCompleted}<span>commands completed</span></div>
    {#if mvp && mvp.statCompleted > 0}
      <div class="award"><span class="medal mvp">MVP</span> {mvp.name} - {mvp.statCompleted} done</div>
    {/if}
    {#if ignored && ignored.statExpired > 0}
      <div class="award"><span class="medal bad">Loose cannon</span> {ignored.name} - {ignored.statExpired} orders ignored</div>
    {:else}
      <div class="award good">Nobody dropped an order. Impressive.</div>
    {/if}

    <table class="scoreboard">
      <thead><tr><th>Crew</th><th>Done</th><th>Missed</th></tr></thead>
      <tbody>
        {#each players as p (p.id)}
          <tr><td>{p.name}{p.id === S.sessionId ? " (you)" : ""}</td><td>{p.statCompleted}</td><td>{p.statExpired}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="feedback">
    {#if S.feedbackSent}
      <p class="thanks">Thanks for the feedback!</p>
    {:else}
      <label class="field">
        <span>How was it? (sent to the dev, no name/email needed)</span>
        <textarea class="input fb" rows="3" maxlength="500" bind:value={fb} placeholder="Too easy? A bug? An idea?"></textarea>
      </label>
      <button class="btn wide" disabled={!fb.trim()} onclick={submit}>Send feedback</button>
    {/if}
  </div>

  {#if mine?.host}
    <button class="btn wide primary" onclick={playAgain}>Play again</button>
  {:else}
    <p class="hint">Waiting for the host to start a new round...</p>
  {/if}
  <button class="btn wide" onclick={() => (location.href = location.pathname)}>Leave</button>
</div>

<style>
  .stats { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .big { font-family: ui-monospace, Menlo, monospace; font-size: 2.2rem; font-weight: 700; color: var(--amber); text-align: center; line-height: 1; }
  .big span { display: block; font-size: 0.8rem; color: var(--muted); font-weight: 400; margin-top: 4px; }
  .award { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
  .award.good { color: var(--ok); }
  .medal { font-family: ui-monospace, Menlo, monospace; font-size: 0.72rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
  .medal.mvp { background: var(--amber); color: var(--amber-ink); }
  .medal.bad { background: var(--danger); color: #fff; }
  .scoreboard { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 0.9rem; }
  .scoreboard th { text-align: left; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--line); padding: 4px 6px; }
  .scoreboard td { padding: 4px 6px; border-bottom: 1px solid var(--line); }
  .scoreboard td:nth-child(2), .scoreboard td:nth-child(3), .scoreboard th:nth-child(2), .scoreboard th:nth-child(3) { text-align: right; width: 60px; }
  .feedback { display: flex; flex-direction: column; gap: 8px; }
  .input.fb { letter-spacing: 0; font-size: 0.95rem; resize: vertical; font-family: inherit; }
  .thanks { color: var(--ok); text-align: center; font-weight: 600; }
</style>
```

## Datei: `spaceteam/packages/client/src/lib/Help.svelte`

```svelte
<script lang="ts">
  import { closeHelp } from "./store.svelte";
</script>

<svelte:window onkeydown={(e) => { if (e.key === "Escape") closeHelp(); }} />

<div class="help-backdrop" onclick={closeHelp} role="presentation">
  <div class="help" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
    <h2>How to play</h2>
    <p class="lead">You are a crew flying a failing spaceship. Everyone plays on their own
      phone, together in the same room.</p>
    <ol>
      <li><b>Read your command out loud.</b> It usually controls something on
        <b>someone else's</b> panel - so shout it across the room.</li>
      <li><b>Hear a command for one of your controls? Do it - fast.</b> Whoever has that
        control acts on it.</li>
      <li><b>Keep the bar above the rising red line.</b> Completed commands push it up;
        misses and time push it down.</li>
      <li><b>Fill the bar to jump to the next sector.</b> Each sector is faster and harsher.</li>
    </ol>
    <h3>Your controls</h3>
    <ul class="legend">
      <li><span class="dot b"></span> <b>Button</b> - press it</li>
      <li><span class="dot t"></span> <b>Toggle</b> - switch on / off</li>
      <li><span class="dot s"></span> <b>Slider</b> - set the number</li>
      <li><span class="dot x"></span> <b>Selector</b> - pick the option</li>
    </ul>
    <p class="tip">It gets loud and chaotic. That is the point.</p>
    <button class="btn wide primary" onclick={closeHelp}>Got it</button>
  </div>
</div>

<style>
  .help-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(10,22,21,0.92); display: flex; align-items: flex-start; justify-content: center; padding: 18px; overflow-y: auto; }
  .help { width: 100%; max-width: 440px; margin: auto; background: var(--panel); border: 1px solid var(--amber); border-radius: var(--radius); padding: 22px; }
  h2 { margin: 0 0 10px; color: var(--amber); font-family: ui-monospace, Menlo, monospace; letter-spacing: 2px; }
  h3 { margin: 18px 0 6px; font-size: 0.95rem; color: var(--ink); }
  .lead { color: var(--ink); margin: 0 0 12px; line-height: 1.4; }
  ol { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 8px; }
  ol li { line-height: 1.35; }
  .legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .legend li { display: flex; align-items: center; gap: 8px; }
  .dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; flex: none; }
  .dot.b { background: var(--danger); }
  .dot.t { background: var(--ok); }
  .dot.s { background: var(--amber); }
  .dot.x { background: #7cc4e8; }
  .tip { color: var(--muted); font-style: italic; margin: 14px 0 16px; }
</style>
```

## Datei: `spaceteam/packages/client/src/lib/Connecting.svelte`

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  const lines = [
    "Waking the ship's reactor...",
    "Spinning up the flux capacitor...",
    "Poking the server with a stick...",
    "Defrosting the cryo-core...",
    "Aligning the neutrino manifold...",
    "Convincing the hamsters to run...",
    "Bribing the plasma injectors...",
    "The free server was napping. Rude to wake it...",
    "Reticulating splines...",
    "Almost there - free tier, be patient...",
  ];

  let msg = $state(lines[0]);
  let progress = $state(8);
  let elapsed = $state(0);
  let i = 0;
  let ticks = 0;
  let timer: ReturnType<typeof setInterval>;

  onMount(() => {
    timer = setInterval(() => {
      ticks++;
      elapsed = ticks * 0.25;
      progress = progress + (96 - progress) * 0.03;
      if (ticks % 10 === 0) { i = (i + 1) % lines.length; msg = lines[i]; }
    }, 250);
  });
  onDestroy(() => clearInterval(timer));
</script>

<div class="connecting">
  <div class="box">
    <div class="title">Boarding</div>
    <div class="msg">{msg}</div>
    <div class="pbar"><div class="pfill" style="width:{progress}%"></div></div>
    {#if elapsed > 3}
      <p class="hint">First start can take up to a minute while the free server wakes up. Hang tight.</p>
    {/if}
  </div>
</div>

<style>
  .connecting {
    position: fixed; inset: 0; z-index: 50;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; background: rgba(10, 22, 21, 0.94);
    backdrop-filter: blur(2px);
    animation: cfade 0.25s ease 0.4s both;
  }
  @keyframes cfade { from { opacity: 0; } to { opacity: 1; } }
  .box {
    width: 100%; max-width: 380px; text-align: center;
    background: var(--panel); border: 1px solid var(--amber);
    border-radius: var(--radius); padding: 26px 22px;
  }
  .title {
    font-family: ui-monospace, Menlo, monospace; letter-spacing: 4px;
    color: var(--amber); font-size: 1.4rem; font-weight: 700; margin-bottom: 14px;
  }
  .msg {
    font-family: ui-monospace, Menlo, monospace; color: var(--ink);
    font-size: 1rem; min-height: 2.6em; line-height: 1.3;
    display: flex; align-items: center; justify-content: center;
  }
  .pbar { height: 8px; background: #0c1a19; border: 1px solid var(--line); border-radius: 5px; overflow: hidden; margin-top: 6px; }
  .pfill { height: 100%; background: var(--amber); transition: width 0.25s linear; }
  .hint { color: var(--muted); font-size: 0.8rem; margin: 14px 0 0; }
</style>
```

