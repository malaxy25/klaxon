// Simple word filter for usernames shown on the public leaderboard (English + German).
// Deliberately short: it catches the obvious cases, not every creative spelling.
// A blocked name is shown and stored as "Anonymous"; the game itself keeps the name.

// Matched anywhere in the name (after normalising, see below). Only words that rarely hide inside normal names.
const BLOCKED = [
  "fuck", "shit", "cunt", "bitch", "whore", "slut", "asshole", "bastard", "nigger", "nigga", "faggot",
  "rapist", "hitler", "porn", "penis", "vagina", "dildo", "wanker", "pussy", "retard", "kkk",
  "wichser", "fotze", "hure", "schlampe", "arschloch", "ficken", "fick", "hurensohn", "missgeburt", "spast",
  "schwuchtel", "neger", "kanake", "nutte", "siegheil", "judensau",
];

// Matched only as the whole name (too common inside other words or real names, e.g. "Hancock", "Essex",
// "Grape", "Nazir", "Niggli", "Fukuoka", "Wankel").
const BLOCKED_EXACT = ["sex", "cock", "dick", "arsch", "heil", "88", "1488", "hh", "rape", "nazi", "fuk", "wank"];

// Lower case, accents off, common digit/symbol swaps undone, everything but letters/digits dropped.
export function normaliseName(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[0@4]/g, (c) => ({ "0": "o", "@": "a", "4": "a" }[c] as string))
    .replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/[5$]/g, "s").replace(/7/g, "t")
    .replace(/[^a-z0-9]/g, "");
}

export function isBlockedName(name: string): boolean {
  const raw = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (BLOCKED_EXACT.includes(raw)) return true;          // "88" before the digit swaps
  const n = normaliseName(name);
  if (BLOCKED_EXACT.includes(n)) return true;
  return BLOCKED.some((w) => n.includes(w));
}

export function publicName(name: string): string {
  const trimmed = name.trim().slice(0, 20);
  return !trimmed || isBlockedName(trimmed) ? "Anonymous" : trimmed;
}
