// Persistentes Usage-Log: kleine JSON-Ereignisse an einen Webhook (z. B. Google Sheet).
// Kein Webhook gesetzt -> no-op. Enthaelt bewusst KEINE Spielernamen (nur Zahlen).
export function postStat(data: Record<string, unknown>): void {
  const hook = process.env.STATS_WEBHOOK;
  if (!hook) return;
  const body = JSON.stringify({ ts: new Date().toISOString(), ...data });
  fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body })
    .catch((e) => console.error("stats webhook failed:", e));
}
