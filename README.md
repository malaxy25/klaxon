# Klaxon

A cooperative "shouting" party game for the browser — same room, no download.
Open the page, share a QR code to join, and yell absurd technobabble commands at
each other before the ship falls apart. An independent, original clone inspired by
Spaceteam.

**Play:** https://klaxon-2dnv.onrender.com
**Current version:** 0.8.14 — see [CHANGELOG.md](CHANGELOG.md)

## What it is

- Same-room co-op for **2–4 players**, each on their own phone or laptop.
- Every player sees a cockpit of absurdly named controls. The commands *you* get
  usually target **someone else's** control — so you have to shout.
- Health vs. a slowly rising "death limit" tug-of-war: fill health to 100 to clear a
  sector; each sector gets faster and harsher.
- No installation, no accounts. Create a room, share the code/QR, go.
- Newcomers get a quick in-app **How to play** (rules + control legend).
- The host picks a **difficulty** (Casual / Normal / Hard / Insane) in the lobby.
- **End-of-game stats** (MVP, most-ignored, per-crew scoreboard) and an in-game
  **feedback** box (no account, no email).

## Tech

TypeScript monorepo (npm workspaces):

- `packages/shared` — pure, testable game engine (no I/O).
- `packages/server` — Colyseus 0.18 room (thin adapter over the engine).
- `packages/client` — Svelte 5 + Vite (mobile-first cockpit UI, QR join).

Deployed on Render: server as a Docker web service, client as a static site.

## Docs

- Run locally: [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)
- Architecture & decisions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Game engine + server internals: [docs/PHASE-1.md](docs/PHASE-1.md)
- Client (UI): [docs/CLIENT.md](docs/CLIENT.md)
- Deploy to Render: [docs/DEPLOY.md](docs/DEPLOY.md)
- Changes: [CHANGELOG.md](CHANGELOG.md)
- Backlog / known issues & ideas: [BACKLOG.md](BACKLOG.md)
- Environment variables: [docs/ENV.md](docs/ENV.md)

## Status

Personal learning project — the journey is the point. Playable and deployed. See the
changelog for what's done and the architecture doc's roadmap for what's next.

## Credits & legal

Inspired by **Spaceteam** by Sleeping Beast Games, and by the open-source
**OpenSpaceTeam** project (concepts only — all code here is original and written from
scratch). "Spaceteam" is a trademark of Sleeping Beast Games; this project is
independent and not affiliated with or endorsed by them.

## License

No license set yet. If you plan to share it, add one (MIT is a common permissive
choice for a project like this).
