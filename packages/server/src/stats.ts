// Persistentes Usage-Log: kleine JSON-Ereignisse in die Datenbank (Neon, Tabelle events) und an einen
// Webhook (z. B. Google Sheet). Beides optional -> ohne DATABASE_URL / STATS_WEBHOOK no-op.
// Enthaelt bewusst KEINE Spielernamen (nur Zahlen).
import { logEvent } from "./leaderboard";

export function postStat(data: Record<string, unknown>): void {
  logEvent(data).catch((e) => console.error("stats db failed:", e));
  const hook = process.env.STATS_WEBHOOK;
  if (!hook) return;
  const body = JSON.stringify({ ts: new Date().toISOString(), ...data });
  fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body })
    .catch((e) => console.error("stats webhook failed:", e));
}
