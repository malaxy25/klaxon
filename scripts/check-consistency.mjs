// Konsistenz-Guard fuer CI: faengt mechanische Drift ab (alte Namen, Versions-/Node-Desync).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const errors = [];
const FORBIDDEN = [/@spaceteam\//, /\bSpaceteamRoom\b/, /\bSpaceteamGame\b/];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist"]);
const SKIP_FILES = new Set([
  "docs/PHASE-1.md", "docs/GETTING-STARTED.md", // historische Dokumente
  "CHANGELOG.md",                                // dokumentiert die Umbenennung
  "package-lock.json",
  "scripts/check-consistency.mjs",               // diese Datei
]);
const EXT = /\.(ts|tsx|svelte|js|mjs|json|yml|yaml|md|html|css)$/;

function walk(dir, rel = "") {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const r = rel ? rel + "/" + name : name;
    const st = statSync(abs);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(abs, r); continue; }
    if (SKIP_FILES.has(r) || !EXT.test(name)) continue;
    const text = readFileSync(abs, "utf8");
    for (const re of FORBIDDEN) if (re.test(text)) errors.push(`Alter Name ${re} in ${r}`);
  }
}
walk(process.cwd());

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const v = pkg.version;
const storeV = (readFileSync("packages/client/src/lib/store.svelte.ts", "utf8").match(/VERSION\s*=\s*"([^"]+)"/) || [])[1];
const clV = (readFileSync("CHANGELOG.md", "utf8").match(/##\s*\[([^\]]+)\]/) || [])[1];
if (storeV !== v) errors.push(`Version: package.json ${v} != store VERSION ${storeV}`);
if (clV !== v) errors.push(`Version: package.json ${v} != CHANGELOG oben ${clV}`);

const dockerNode = (readFileSync("Dockerfile", "utf8").match(/FROM node:(\d+)/) || [])[1];
const nodeVer = readFileSync(".node-version", "utf8").trim().split(".")[0];
if (dockerNode !== nodeVer) errors.push(`Node: Dockerfile node:${dockerNode} != .node-version ${nodeVer}`);

if (errors.length) {
  console.error("Konsistenz-Check FEHLGESCHLAGEN:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("Konsistenz-Check ok (Namen, Version synchron, Node synchron).");
