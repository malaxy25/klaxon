# Changelog

All notable changes to Klaxon. Format loosely follows Keep a Changelog; versioning is
informal for a hobby project.

## [0.5.0] - 2026-09-21
### Added
- Difficulty presets in the lobby (Casual / Normal / Hard / Insane), chosen by the host
  before starting. Each preset starts the game deeper into the difficulty curve (a higher
  starting sector): shorter command times, faster health drain, larger panels.
- End-of-game stats: total commands completed, an MVP (most completed) and a
  "Loose cannon" award (most orders ignored), plus a per-crew scoreboard.
- In-game feedback box on the game-over screen: testers send feedback with no account
  and without seeing the dev's email. The server logs it (visible in Render logs) and
  optionally forwards it to a `FEEDBACK_WEBHOOK` (e.g. a Discord webhook).
### Changed
- Default difficulty raised (game now starts at sector 3) after playtest feedback that
  the early game was too easy.

## [0.4.0] - 2026-09-21
### Added
- In-app **How to play** help overlay: four quick rules plus a color-coded legend of
  the four control types (matching the control accents). Opens from a button on Home
  and a link in the lobby, auto-shows once on a first visit (remembered in
  localStorage), and closes via the button, the backdrop, or the Escape key.

## [0.3.0] - 2026-09-21
### Added
- Variable panel layout: each control has a footprint (w/h); sliders and multi-option
  selectors are wider/bigger, packed into a dense, responsive grid.
- Per-command countdown bar (duration derived from the current level's difficulty).
- Type-specific color accents on controls (button / toggle / slider / selector).
- Cold-start overlay: progress bar + rotating messages while the free server wakes,
  with automatic connection retry (up to ~70 s).
### Fixed
- Small-screen panel layout (e.g. iPhone 13 mini): fewer columns and a non-collapsing
  tile layout so labels no longer overlap the controls.

## [0.2.0] - 2026-09-21
### Added
- Player names — entered on Home / editable in the lobby, remembered in localStorage.
- "Play again" after game over: the host returns everyone to the ready room (players
  stay in, ready flags kept).
- Sound via the Web Audio API (no asset files) for completed / expired / level-up /
  game-over, plus a mute toggle.
- Screenshake on damage and a "Sector N" banner on level-up.

## [0.1.0] - 2026-09-20
### Added
- First playable release: lobby with room code + QR join; core game loop (panels,
  instructions, health-vs-death-limit tug-of-war, sectors, game over); Svelte client
  with the "analog cockpit" theme.
- Pure game engine in `shared`; Colyseus 0.18 server room; deployed to Render
  (server as a Docker web service, client as a static site).
