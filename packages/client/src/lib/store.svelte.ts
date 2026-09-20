import { Client } from "@colyseus/sdk";

export type ControlView = {
  id: string; kind: string; label: string; value: string;
  min: number; max: number; options: string[];
};
export type PlayerView = {
  id: string; name: string; host: boolean; ready: boolean;
  connected: boolean; instructionText: string; panel: ControlView[];
};

export const S = $state({
  screen: "home" as "home" | "lobby" | "game" | "over",
  connecting: false,
  error: "",
  roomId: "",
  sessionId: "",
  phase: "lobby",
  level: 0,
  health: 50,
  deathLimit: 0,
  players: [] as PlayerView[],
  flash: "" as "" | "good" | "bad",
});

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string) ?? "ws://localhost:2567";

let client: Client | null = null;
let room: any = null;
let flashTimer: ReturnType<typeof setTimeout> | undefined;

export function me(): PlayerView | undefined {
  return S.players.find((p) => p.id === S.sessionId);
}

export function joinUrl(): string {
  return location.origin + location.pathname + "?r=" + S.roomId;
}

function snapshot() {
  const st = room?.state;
  if (!st) return;
  S.phase = st.phase;
  S.level = st.level;
  S.health = st.health;
  S.deathLimit = st.deathLimit;

  const players: PlayerView[] = [];
  st.players.forEach((p: any) => {
    const panel: ControlView[] = [];
    p.panel.forEach((c: any) =>
      panel.push({
        id: c.id, kind: c.kind, label: c.label, value: c.value,
        min: c.min, max: c.max, options: [...c.options],
      })
    );
    players.push({
      id: p.id, name: p.name, host: p.host, ready: p.ready,
      connected: p.connected, instructionText: p.instructionText, panel,
    });
  });
  S.players = players;

  S.screen = st.phase === "over" ? "over" : st.phase === "playing" ? "game" : "lobby";
}

function pulse(kind: "good" | "bad") {
  S.flash = kind;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (S.flash = ""), 250);
}

async function bind(r: any) {
  room = r;
  S.roomId = r.roomId;
  S.sessionId = r.sessionId;
  r.onStateChange(() => snapshot());
  r.onMessage("evt", (e: any) => {
    if (e.type === "completed") pulse("good");
    else if (e.type === "expired") pulse("bad");
  });
  r.onLeave(() => {
    S.error = "Connection lost.";
    S.screen = "home";
    room = null;
  });
  snapshot();
}

export async function createGame() {
  S.connecting = true; S.error = "";
  try {
    client ??= new Client(SERVER_URL);
    await bind(await client.create("spaceteam"));
  } catch (e: any) {
    S.error = e?.message ?? "Connection failed.";
  } finally {
    S.connecting = false;
  }
}

export async function joinGame(id: string) {
  S.connecting = true; S.error = "";
  try {
    client ??= new Client(SERVER_URL);
    await bind(await client.joinById(id));
  } catch (e: any) {
    S.error = "Join failed: " + (e?.message ?? "room not found.");
  } finally {
    S.connecting = false;
  }
}

export function ready(v: boolean) { room?.send("ready", v); }
export function start() { room?.send("start"); }
export function setControl(controlId: string, value: string) {
  room?.send("setControl", { controlId, value });
}