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
