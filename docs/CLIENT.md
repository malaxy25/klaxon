# Klaxon — Client

Der Svelte-Client. Vollstaendige Dateien mit Pfad. BOM-frei + ASCII (siehe GETTING-STARTED.md).

## Neu in v0.8.8

- Debug-Modus per GUI: Version im Home-Footer 5x tippen -> Debug an/aus (persistent in
  localStorage), kein `?debug` noetig. Footer zeigt "debug", wenn aktiv.

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

## Datei: `spaceteam/packages/client/src/lib/store.svelte.ts`

```ts
import { Client } from "@colyseus/sdk";

export const VERSION = "0.8.8";
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

let alarmTimer: ReturnType<typeof setInterval> | undefined;
function klaxon() { beep(740, 150, "square", 0.045); setTimeout(() => beep(560, 150, "square", 0.045), 170); }
function startAlarm() { if (alarmTimer) return; klaxon(); alarmTimer = setInterval(klaxon, 950); }
function stopAlarm() { if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = undefined; } }

function playSound(kind: "completed" | "expired" | "nextLevel" | "gameOver" | "broke" | "slimed" | "eventStart" | "eventPassed" | "eventFailed") {
  if (kind === "completed") beep(660, 90, "square");
  else if (kind === "expired") beep(150, 220, "sawtooth");
  else if (kind === "nextLevel") { beep(523, 90); setTimeout(() => beep(784, 160), 110); }
  else if (kind === "broke") { beep(210, 110, "sawtooth", 0.06); setTimeout(() => beep(150, 170, "sawtooth", 0.06), 90); }
  else if (kind === "slimed") { beep(320, 120, "sine", 0.05); setTimeout(() => beep(190, 200, "sine", 0.05), 100); }
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
  if (!S.muted) beep(880, 60);
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
  import { S, me, dbg } from "./store.svelte";

  let open = $state(false);
  let reveal = $state(false);
  let paused = $state(false);
  let statsTimer: ReturnType<typeof setInterval> | undefined;

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

## Datei: `spaceteam/packages/client/src/App.svelte`

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { S, joinByCode, openHelp, initMotion, initDebug } from "./lib/store.svelte";
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

{#if S.eventType}<EventOverlay />{/if}
{#if S.eventResult}
  <div class="ev-result {S.eventResult}">{S.eventResult === "passed" ? "SURVIVED" : "HULL BREACH"}</div>
{/if}
{#if S.reconnecting}<div class="reconnect-overlay"><div class="rc-box">Reconnecting...</div></div>{/if}
{#if S.connecting}<Connecting />{/if}
{#if S.showHelp}<Help />{/if}
{#if S.debug}<Debug />{/if}
```

