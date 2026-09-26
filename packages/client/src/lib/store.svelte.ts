import { Client } from "@colyseus/sdk";

export const VERSION = "0.8.43";
export const REPO_URL = "https://github.com/malaxy25/klaxon";
export const DONATE_URL = "https://buymeacoffee.com/malaxy";

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
  intermission: false,
  intermissionMs: 0,
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

function playSound(kind: "completed" | "expired" | "nextLevel" | "gameOver" | "broke" | "slimed" | "frozen" | "electro" | "overheat" | "rewire" | "eventStart" | "eventPassed" | "eventFailed" | "sectorCleared") {
  if (kind === "completed") beep(660, 90, "square");
  else if (kind === "expired") beep(150, 220, "sawtooth");
  else if (kind === "nextLevel") { beep(523, 90); setTimeout(() => beep(784, 160), 110); }
  else if (kind === "sectorCleared") { beep(523, 110, "triangle", 0.06); setTimeout(() => beep(659, 110, "triangle", 0.06), 120); setTimeout(() => beep(784, 110, "triangle", 0.06), 240); setTimeout(() => beep(1047, 260, "triangle", 0.06), 360); }
  else if (kind === "broke") { sweep(320, 110, 180, "sawtooth", 0.07); noiseBurst(70, 0.05); }
  else if (kind === "slimed") { sweep(520, 150, 260, "sine", 0.06); setTimeout(() => noiseBurst(130, 0.035), 60); }
  else if (kind === "frozen") { beep(1200, 60, "sine", 0.05); setTimeout(() => beep(1650, 90, "sine", 0.05), 70); }
  else if (kind === "electro") { beep(150, 70, "sawtooth", 0.06); noiseBurst(50, 0.05); setTimeout(() => beep(95, 90, "sawtooth", 0.06), 70); }
  else if (kind === "overheat") { noiseBurst(220, 0.05); beep(320, 150, "sawtooth", 0.04); }
  else if (kind === "rewire") { beep(420, 55, "square", 0.05); setTimeout(() => beep(660, 90, "square", 0.05), 65); }
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
function currentDevice(): { os: string; sw: number; sh: number; dpr: number; orient: string; pwa: number } {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const os = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "desktop";
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  const h = typeof window !== "undefined" ? window.innerHeight : 0;
  const dpr = typeof window !== "undefined" ? Math.round((window.devicePixelRatio || 1) * 100) / 100 : 1;
  const orient = w >= h ? "landscape" : "portrait";
  let pwa = false;
  try {
    pwa = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (navigator as any).standalone === true;
  } catch { pwa = false; }
  return { os, sw: w, sh: h, dpr, orient, pwa: pwa ? 1 : 0 };
}
function currentMaxTiles(): number {
  const h = typeof window !== "undefined" ? window.innerHeight : 900;
  if (h < 680) return 4;
  if (h < 780) return 5;
  return 6;
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
  S.eventType = st.eventType ?? "";
  S.eventMs = st.eventMs ?? 0;
  S.intermission = st.intermission ?? false;
  S.intermissionMs = st.intermissionMs ?? 0;

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
    else if (e.type === "frozen") { pulse("bad"); playSound("frozen"); }
    else if (e.type === "electro") { pulse("bad"); playSound("electro"); }
    else if (e.type === "overheat") { pulse("bad"); playSound("overheat"); }
    else if (e.type === "rewire") { pulse("bad"); playSound("rewire"); }
  });
  r.onLeave((code: number) => { handleLeave(code); });
  snapshot();
  room?.send("motion", S.motionOk);
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
  S.error = "Connection lost - the room closed or the server went to sleep. Just create or join again.";
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
    await bind(await connectWithRetry(() => client!.create("spaceteam", { code: newCode, name: currentName(), maxTiles: currentMaxTiles(), debugKey: currentDebugKey(), ...currentDevice() })));
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
    const deadline = Date.now() + 20000; // nur fuer echte Verbindungsprobleme kurz retryen
    let room: any = null;
    for (;;) {
      try {
        room = await client!.join("spaceteam", { code: cc, name: currentName(), maxTiles: currentMaxTiles(), debugKey: currentDebugKey(), ...currentDevice() });
        break;
      } catch (e: any) {
        const c = e?.code;
        const msg = String(e?.message ?? e ?? "");
        // Matchmaking "kein Raum gefunden" / gesperrt -> sofort abbrechen (nicht 70s warten)
        const notFound = (typeof c === "number" && c >= 4210 && c <= 4299) || /no rooms|not found|criteria|locked/i.test(msg);
        if (notFound) { S.error = "No game found for code " + cc + ". Is the room still open on the host?"; return; }
        if (Date.now() > deadline) { S.error = "Could not reach the server - try again in a moment."; return; }
        await sleep(2500);
      }
    }
    await bind(room);
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
export function sendContinue() { room?.send("continueSector"); }
export function kick(id: string) { room?.send("kick", id); }
export function dbg(msg: string, payload?: any) { room?.send(msg, payload); }
function currentDebugKey(): string { try { return localStorage.getItem("klaxon_debug_key") || ""; } catch { return ""; } }
export function initDebug() {
  try {
    const p = new URLSearchParams(location.search);
    const val = p.get("debug"); // null = fehlt, "" = ?debug, "x" = ?debug=x
    const saved = localStorage.getItem("klaxon_debug") === "1";
    S.debug = p.has("debug") || saved;
    if (p.has("debug")) localStorage.setItem("klaxon_debug", "1");
    if (val) localStorage.setItem("klaxon_debug_key", val);
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
    room?.send("motion", S.motionOk);
  } catch { S.motionOk = false; }
}
export function setControl(controlId: string, value: string) {
  room?.send("setControl", { controlId, value });
}
