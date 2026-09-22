# Klaxon — Client

Der Svelte-Client. Vollstaendige Dateien mit Pfad. Auf Windows-PowerShell BOM-frei
(`Write-NoBom`) und in ASCII schreiben - siehe M0b in `GETTING-STARTED.md`.

> Verifiziert: `vite build` kompiliert sauber. Kernpfade (Code-Join, kaputte Panels +
> Reparatur, setDifficulty, Feedback, Stats) ueber den echten Server getestet.
> Cockpit-Optik am besten auf dem Geraet pruefen.

## Highlights

- 4-Zeichen-**Raumcode** (Join per Code + QR), Raum-Lock nach Start.
- **Kaputte Panels**: Control blockiert, per Halten (~1,5 s) reparieren.
- Reicherer **Sound** inkl. Klaxon-Alarm bei niedriger Health; Cockpit-Kacheln,
  LED-Readouts, One-Screen-Fit, wenige/grosse Kacheln.
- Lobby: Schwierigkeits-Presets. Game Over: Stats + Feedback. How-to-play, Cold-Start-Overlay.

## Dateibaum

```
packages/client/src/
├── app.css               # Theme + Starfield + diverse Bloecke
├── App.svelte            # Router + QR-Join (Code) + Overlays
└── lib/
    ├── store.svelte.ts   # Zustand, Verbindung, Code-Join, Sound/Alarm, Repair, Stats, VERSION
    ├── Help.svelte  Connecting.svelte  Control.svelte (broken/repair)
    ├── Home.svelte  Lobby.svelte  Game.svelte  GameOver.svelte
```

---

# Vollstaendige Dateien

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
.join-card .url { color: var(--muted); font-size: 0.75rem; word-break: break-all; }
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
```

## Datei: `spaceteam/packages/client/src/lib/store.svelte.ts`

```ts
import { Client } from "@colyseus/sdk";

export const VERSION = "0.7.0";
export const REPO_URL = "https://github.com/malaxy25/klaxon";

export type ControlView = {
  id: string; kind: string; label: string; value: string;
  min: number; max: number; options: string[]; w: number; h: number; broken: boolean;
};
export type PlayerView = {
  id: string; name: string; host: boolean; ready: boolean;
  connected: boolean; instructionText: string; panel: ControlView[];
  statCompleted: number; statExpired: number;
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

let alarmTimer: ReturnType<typeof setInterval> | undefined;
function klaxon() { beep(740, 150, "square", 0.045); setTimeout(() => beep(560, 150, "square", 0.045), 170); }
function startAlarm() { if (alarmTimer) return; klaxon(); alarmTimer = setInterval(klaxon, 950); }
function stopAlarm() { if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = undefined; } }

function playSound(kind: "completed" | "expired" | "nextLevel" | "gameOver" | "broke") {
  if (kind === "completed") beep(660, 90, "square");
  else if (kind === "expired") beep(150, 220, "sawtooth");
  else if (kind === "nextLevel") { beep(523, 90); setTimeout(() => beep(784, 160), 110); }
  else if (kind === "broke") { beep(210, 110, "sawtooth", 0.06); setTimeout(() => beep(150, 170, "sawtooth", 0.06), 90); }
  else if (kind === "gameOver") { stopAlarm(); noiseBurst(500, 0.1); beep(300, 160, "sawtooth"); setTimeout(() => beep(130, 450, "sawtooth"), 150); }
}

export function openHelp() { S.showHelp = true; }
export function closeHelp() { S.showHelp = false; }

export function toggleMute() {
  S.muted = !S.muted;
  lsSet("klaxon_muted", S.muted ? "1" : "0");
  ensureAudio();
  if (!S.muted) beep(880, 60);
}

export function me(): PlayerView | undefined {
  return S.players.find((p) => p.id === S.sessionId);
}

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

  const players: PlayerView[] = [];
  st.players.forEach((p: any) => {
    const panel: ControlView[] = [];
    p.panel.forEach((c: any) =>
      panel.push({
        id: c.id, kind: c.kind, label: c.label, value: c.value,
        min: c.min, max: c.max, options: [...c.options], w: c.w ?? 1, h: c.h ?? 1, broken: c.broken ?? false,
      })
    );
    players.push({
      id: p.id, name: p.name, host: p.host, ready: p.ready,
      connected: p.connected, instructionText: p.instructionText, panel,
      statCompleted: p.statCompleted ?? 0, statExpired: p.statExpired ?? 0,
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
}

async function bind(r: any) {
  room = r;
  S.roomId = r.roomId;
  S.sessionId = r.sessionId;
  r.onStateChange(() => snapshot());
  r.onMessage("feedbackAck", () => { S.feedbackSent = true; });
  r.onMessage("evt", (e: any) => {
    if (e.type === "completed") { pulse("good"); playSound("completed"); }
    else if (e.type === "expired") { pulse("bad"); playSound("expired"); }
    else if (e.type === "broke") { pulse("bad"); playSound("broke"); }
  });
  r.onLeave(() => {
    S.error = "Connection lost.";
    S.screen = "home";
    room = null;
  });
  snapshot();
  commitName();
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
    await bind(await connectWithRetry(() => client!.create("spaceteam", { code: newCode })));
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
      await bind(await connectWithRetry(() => client!.join("spaceteam", { code: cc })));
    } catch {
      S.error = "No game found for code " + cc + ".";
    }
  } catch (e: any) {
    S.error = "Join failed: " + (e?.message ?? "");
  } finally {
    S.connecting = false;
  }
}
export function ready(v: boolean) { room?.send("ready", v); }
export function start() { room?.send("start"); }
export function playAgain() { room?.send("playAgain"); }
export function repairControl(controlId: string) { room?.send("repairControl", controlId); }
export function setControl(controlId: string, value: string) {
  room?.send("setControl", { controlId, value });
}
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

## Datei: `spaceteam/packages/client/src/lib/Control.svelte`

```svelte
<script lang="ts">
  import { setControl, repairControl, type ControlView } from "./store.svelte";
  let { control }: { control: ControlView } = $props();

  const press = () => setControl(control.id, "");
  const flip = () => setControl(control.id, control.value === "true" ? "false" : "true");
  const onSlide = (e: Event) => setControl(control.id, (e.target as HTMLInputElement).value);
  const choose = (opt: string) => setControl(control.id, opt);

  let prog = $state(0);
  let holding = false;
  let raf = 0;
  const REPAIR_MS = 1500;
  function startHold(e: PointerEvent) {
    if (!control.broken) return;
    e.preventDefault();
    holding = true;
    const t0 = performance.now();
    const step = () => {
      if (!holding) return;
      prog = Math.min(1, (performance.now() - t0) / REPAIR_MS);
      if (prog >= 1) { holding = false; prog = 0; repairControl(control.id); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function endHold() { holding = false; prog = 0; cancelAnimationFrame(raf); }
</script>

<div class="control kind-{control.kind}" class:broken={control.broken}
     style="grid-column: span {control.w}; grid-row: span {control.h};">
  <div class="face">
    {#if control.kind === "button"}
      <button class="hw press" onclick={press}>PRESS</button>
    {:else if control.kind === "toggle"}
      <button class="hw toggle" class:on={control.value === "true"} onclick={flip}>{control.value === "true" ? "ON" : "OFF"}</button>
    {:else if control.kind === "slider"}
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

  {#if control.broken}
    <div class="broken-overlay" onpointerdown={startHold} onpointerup={endHold} onpointerleave={endHold} onpointercancel={endHold}>
      <div class="fix">HOLD<br />TO FIX</div>
      <div class="fixbar"><div class="fixfill" style="width:{prog * 100}%"></div></div>
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
  .control.broken { filter: grayscale(0.5) brightness(0.72); }

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
  .press { background: linear-gradient(180deg,#5a1c1c,#3a1414); border-color: #6b2020; color: #ffd9d2; }
  .press:active { box-shadow: 0 0 12px rgba(229,72,77,0.6); }
  .range { width: 100%; accent-color: var(--amber); }
  .readout {
    align-self: center; font-family: ui-monospace, Menlo, monospace; color: var(--amber); font-size: 1.05rem;
    background: #0a1615; border: 1px solid var(--line); border-radius: 4px; padding: 1px 10px;
    box-shadow: inset 0 0 8px rgba(0,0,0,0.6); text-shadow: 0 0 6px rgba(245,166,35,0.6);
  }
  .opts { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .opts .hw { width: auto; flex: 1 1 42%; padding: 0.4em; font-size: 0.8rem; }

  .broken-overlay {
    position: absolute; inset: 0; z-index: 3; touch-action: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
    border: 2px solid var(--danger); border-radius: 8px;
    background: repeating-linear-gradient(45deg, rgba(229,72,77,0.18), rgba(229,72,77,0.18) 8px, rgba(0,0,0,0.4) 8px, rgba(0,0,0,0.4) 16px);
  }
  .broken-overlay .fix { font-family: ui-monospace, Menlo, monospace; font-weight: 700; color: #ffd9d2; font-size: 0.8rem; text-align: center; line-height: 1.05; text-shadow: 0 0 6px rgba(229,72,77,0.9); }
  .fixbar { width: 72%; height: 6px; background: rgba(0,0,0,0.55); border-radius: 3px; overflow: hidden; }
  .fixfill { height: 100%; background: var(--ok); }
</style>
```

## Datei: `spaceteam/packages/client/src/lib/Home.svelte`

```svelte
<script lang="ts">
  import { S, createGame, joinByCode, updateName, openHelp, VERSION, REPO_URL } from "./store.svelte";
  let code = $state("");
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
    <input class="input" placeholder="Room code" maxlength="6" bind:value={code} style="text-transform:uppercase" />
    <button class="btn" disabled={!code || S.connecting} onclick={() => joinByCode(code)}>Join</button>
  </div>

  {#if S.error}<p class="error">{S.error}</p>{/if}

  <button class="btn wide" onclick={openHelp}>How to play</button>

  <footer class="version">Klaxon v{VERSION} &middot; <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a></footer>
</div>
```

## Datei: `spaceteam/packages/client/src/lib/Lobby.svelte`

```svelte
<script lang="ts">
  import QRCode from "qrcode";
  import { S, me, ready, start, setDifficulty, joinUrl, updateName, commitName, openHelp, VERSION, REPO_URL } from "./store.svelte";

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
</script>

<div class="lobby">
  <h1>Ready room</h1>
  <p class="hint">Others join by scanning the code - same room, no download.</p>
  <button class="helplink" onclick={openHelp}>How to play</button>

  <div class="join-card">
    <div class="code">{S.code}</div>
    {#if qr}<img class="qr" src={qr} alt="Scan to join" width="220" height="220" />{/if}
    <div class="url">{joinUrl()}</div>
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
      <li class:ready={p.ready}>
        <span>{p.name}{p.host ? " - host" : ""}{p.id === S.sessionId ? " - you" : ""}</span>
        <span>{p.ready ? "ready" : "waiting"}</span>
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
  let healthPct = $derived(Math.max(0, Math.min(100, S.health)));
  let floorPct = $derived(Math.max(0, Math.min(100, S.deathLimit)));
  let danger = $derived(S.health - S.deathLimit < 20);
  let cmdMs = $derived(difficultyForLevel(S.level).instructionTimeMs);
</script>

<div class="game" class:flash-good={S.flash === "good"} class:flash-bad={S.flash === "bad"} class:shake={S.shake}>
  <header class="hud">
    <span class="sector">SECTOR {S.level}</span>
    <div class="bar" class:danger>
      <div class="floor" style="width:{floorPct}%"></div>
      <div class="health" style="width:{healthPct}%"></div>
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
  .floor { position: absolute; inset: 0 auto 0 0; background: repeating-linear-gradient(45deg,#3a1414,#3a1414 5px,#511a1a 5px,#511a1a 10px); }
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

  .panel { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); grid-auto-rows: minmax(0, 1fr); grid-auto-flow: row dense; gap: 6px; }
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

## Datei: `spaceteam/packages/client/src/App.svelte`

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { S, joinByCode, openHelp } from "./lib/store.svelte";
  import Home from "./lib/Home.svelte";
  import Lobby from "./lib/Lobby.svelte";
  import Game from "./lib/Game.svelte";
  import GameOver from "./lib/GameOver.svelte";
  import Connecting from "./lib/Connecting.svelte";
  import Help from "./lib/Help.svelte";

  onMount(() => {
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

{#if S.connecting}
  <Connecting />
{/if}

{#if S.showHelp}
  <Help />
{/if}
```

