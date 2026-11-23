// Global leaderboard in Neon (Postgres over HTTPS). Off without DATABASE_URL -> no-op.
// Stores per run: difficulty, sector, score, crew size, duration; per player: the chosen username and
// orders done/missed. Players see where their crew and their own pace stand among all runs.
//
// Tables (created once in the Neon SQL editor):
//   create table runs (id bigserial primary key, created_at timestamptz not null default now(),
//     start_sector int not null, end_sector int not null, score int not null, crew int not null,
//     duration_s int not null, completed int not null, expired int not null);
//   create table run_players (run_id bigint not null references runs(id) on delete cascade,
//     name text not null, completed int not null, expired int not null, per_min real not null);
//   create index runs_score on runs (score);
//   create index run_players_run on run_players (run_id);
//   create index run_players_per_min on run_players (per_min);
import { neon } from "@neondatabase/serverless";
import { publicName } from "./names";

export interface RunPlayer { id: string; name: string; completed: number; expired: number }
export interface Run {
  startSector: number;
  endSector: number;
  crew: number;        // players at the start
  durationSec: number;
  players: RunPlayer[]; // players still in the game at the end
}
export interface TopRun { score: number; sector: number; startSector: number; crew: number; names: string; date: string; mine: boolean }
export interface Ranking {
  crew: { better: number | null; n: number; place: number; score: number };
  players: Record<string, { better: number | null; perMin: number }>;
  top: TopRun[];
}

// Below this many runs/player rows the percentage means little; the client then shows the place only.
export const MIN_COMPARE = 10;
export const MIN_DURATION_SEC = 30;

// Same formula as the game-over rank: how far you got + bonus for the warm-up sectors skipped.
export const runScore = (startSector: number, endSector: number) => endSector + Math.max(0, startSector - 1);

export const perMinute = (completed: number, durationSec: number) =>
  durationSec > 0 ? Math.round((completed / (durationSec / 60)) * 100) / 100 : 0;

// Share of the OTHER entries that are strictly lower, in whole percent. null = not enough data.
export function betterThan(lower: number, total: number): number | null {
  if (total < MIN_COMPARE) return null;
  return Math.round((lower / (total - 1)) * 100);
}

// Which runs count: no training, a real crew, not aborted right away. Debug use is checked by the room.
export function countsForLeaderboard(r: Pick<Run, "startSector" | "crew" | "durationSec">): boolean {
  return r.startSector >= 1 && r.crew >= 2 && r.durationSec >= MIN_DURATION_SEC;
}

const url = process.env.DATABASE_URL || "";
const sql = url ? neon(url) : null;
export const leaderboardEnabled = () => !!sql;

const int = (v: unknown) => Number(v) || 0;

// Saves the run and returns where it stands. Throws on database errors (the caller logs them).
export async function recordRun(r: Run): Promise<Ranking | null> {
  if (!sql) return null;
  const score = runScore(r.startSector, r.endSector);
  const completed = r.players.reduce((a, p) => a + p.completed, 0);
  const expired = r.players.reduce((a, p) => a + p.expired, 0);
  const perMin = r.players.map((p) => perMinute(p.completed, r.durationSec));

  const [{ id }] = await sql.query(
    "insert into runs (start_sector, end_sector, score, crew, duration_s, completed, expired) " +
    "values ($1, $2, $3, $4, $5, $6, $7) returning id",
    [r.startSector, r.endSector, score, r.crew, Math.round(r.durationSec), completed, expired]) as { id: string }[];
  if (r.players.length) {
    await sql.query(
      "insert into run_players (run_id, name, completed, expired, per_min) " +
      "select $1::bigint, * from unnest($2::text[], $3::int[], $4::int[], $5::real[])",
      [id, r.players.map((p) => publicName(p.name)), r.players.map((p) => p.completed),
        r.players.map((p) => p.expired), perMin]);
  }

  const [crewRows, playerRows, topRows] = await Promise.all([
    sql.query(
      "select (select count(*) from runs) as n, " +
      "(select count(*) from runs where score < $1) as lower, " +
      "(select count(*) from runs where score > $1) + 1 as place", [score]),
    sql.query(
      "select x.i, (select count(*) from run_players q where q.per_min < x.v) as lower, " +
      "(select count(*) from run_players) as m " +
      "from unnest($1::real[]) with ordinality as x(v, i) order by x.i", [perMin]),
    sql.query(TOP_SQL("")),
  ]) as Record<string, unknown>[][];
  topCache = null;   // the home screen shows the new run at once

  const c = crewRows[0] || {};
  const players: Ranking["players"] = {};
  r.players.forEach((p, i) => {
    const row = playerRows[i] || {};
    players[p.id] = { better: betterThan(int(row.lower), int(row.m)), perMin: perMin[i] };
  });
  return {
    crew: { better: betterThan(int(c.lower), int(c.n)), n: int(c.n), place: int(c.place), score },
    players,
    top: topRows.map((t) => toTopRun(t, String(id))),
  };
}

// Top 10 runs; `where` limits the time range (e.g. this week). Names re-checked against the word filter.
const TOP_SQL = (where: string) =>
  "select r.id, r.score, r.start_sector, r.end_sector, r.crew, r.created_at, " +
  "(select array_agg(p.name order by p.completed desc) from run_players p where p.run_id = r.id) as names " +
  "from runs r " + where + " order by r.score desc, r.completed desc, r.id asc limit 10";

function toTopRun(t: Record<string, unknown>, mineId = ""): TopRun {
  const names = Array.isArray(t.names) ? (t.names as string[]) : [];
  return {
    score: int(t.score), sector: int(t.end_sector), startSector: int(t.start_sector), crew: int(t.crew),
    names: names.map(publicName).join(", "), date: new Date(String(t.created_at)).toISOString().slice(0, 10),
    mine: !!mineId && String(t.id) === mineId,
  };
}

// For the home screen: best crews of the last 7 days and of all time. Cached for a few minutes so that
// visitors don't wake the database each time (Neon's free compute hours); a new run clears the cache.
export interface TopLists { week: TopRun[]; allTime: TopRun[] }
let topCache: { at: number; data: TopLists } | null = null;
export const TOP_CACHE_MS = 5 * 60 * 1000;

export async function topCrews(): Promise<TopLists | null> {
  if (!sql) return null;
  if (topCache && Date.now() - topCache.at < TOP_CACHE_MS) return topCache.data;
  const [week, allTime] = await Promise.all([
    sql.query(TOP_SQL("where r.created_at > now() - interval '7 days'")),
    sql.query(TOP_SQL("")),
  ]) as Record<string, unknown>[][];
  const data = { week: week.map((t) => toTopRun(t)), allTime: allTime.map((t) => toTopRun(t)) };
  topCache = { at: Date.now(), data };
  return data;
}

// ---- Usage log and feedback (were in a Google Sheet via webhook; the webhooks still run alongside) ----
//   create table events (id bigserial primary key, ts timestamptz not null default now(), event text not null,
//     rid text, room text, pid text, data jsonb not null default '{}');
//   create table feedback (id bigserial primary key, ts timestamptz not null default now(), rid text, room text,
//     pid text, sector int, difficulty int, msg text not null, email text, contact boolean not null default false);

// One usage event (start, end, device, tutorial …); fields other than event/rid/room/pid go to `data`.
export async function logEvent(e: Record<string, unknown>): Promise<void> {
  if (!sql) return;
  const { event, rid, room, pid, ...data } = e;
  await sql.query("insert into events (event, rid, room, pid, data) values ($1, $2, $3, $4, $5::jsonb)",
    [String(event || "?"), rid == null ? null : String(rid), room == null ? null : String(room),
      pid == null ? null : String(pid), JSON.stringify(data)]);
}

export interface FeedbackRow { rid: string; room: string; pid: string; sector: number; difficulty: number; msg: string; email: string; contact: boolean }
export async function saveFeedback(f: FeedbackRow): Promise<void> {
  if (!sql) return;
  await sql.query(
    "insert into feedback (rid, room, pid, sector, difficulty, msg, email, contact) values ($1, $2, $3, $4, $5, $6, $7, $8)",
    [f.rid, f.room, f.pid, f.sector, f.difficulty, f.msg, f.email || null, f.contact]);
}
