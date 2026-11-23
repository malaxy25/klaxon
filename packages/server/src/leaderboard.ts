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
      [id, r.players.map((p) => p.name.slice(0, 20)), r.players.map((p) => p.completed),
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
    sql.query(
      "select r.id, r.score, r.start_sector, r.end_sector, r.crew, r.created_at, " +
      "(select string_agg(p.name, ', ' order by p.completed desc) from run_players p where p.run_id = r.id) as names " +
      "from runs r order by r.score desc, r.completed desc, r.id asc limit 10"),
  ]) as Record<string, unknown>[][];

  const c = crewRows[0] || {};
  const players: Ranking["players"] = {};
  r.players.forEach((p, i) => {
    const row = playerRows[i] || {};
    players[p.id] = { better: betterThan(int(row.lower), int(row.m)), perMin: perMin[i] };
  });
  return {
    crew: { better: betterThan(int(c.lower), int(c.n)), n: int(c.n), place: int(c.place), score },
    players,
    top: topRows.map((t) => ({
      score: int(t.score), sector: int(t.end_sector), startSector: int(t.start_sector), crew: int(t.crew),
      names: String(t.names || ""), date: new Date(String(t.created_at)).toISOString().slice(0, 10),
      mine: String(t.id) === String(id),
    })),
  };
}
