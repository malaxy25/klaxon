# Changelog

All notable changes to Klaxon. Format loosely follows Keep a Changelog; versioning is
informal for a hobby project.

## [0.8.0] - 2026-09-22
### Added
- **Special team events (G2):** a random event interrupts play - **Meteor shower
  (shake)**, **Black hole (flip/tilt your phone)**, **Brace (tap fast)**. Everyone must
  react before the timer runs out; success heals the ship, failure damages it.
- Clear pass/fail feedback that works even when you cannot see the screen: distinct
  sounds (rising alarm / success chord / explosion), a full-screen SURVIVED / HULL
  BREACH banner, and device vibration where supported.
- Optional "Enable shake & tilt" in the lobby (iOS motion permission); a tap fallback
  always works if motion is unavailable.
### Fixed
- iOS no longer selects/marks text when holding a control (e.g. repairing a jammed panel).

## [0.7.0] - 2026-09-22
### Added
- **Breaking panels (G1):** under time pressure a random control jams (rate rises with
  sector, never the current target, max = player count). A jammed control can't be used
  and isn't targeted until repaired by **holding it ~1.5 s** (progress bar + alarm).
- **4-character room code (P2):** friendly codes like `JZDQ` via Colyseus matchmaking
  (`filterBy(["code"])`); QR and code both join. Rooms lock once the game starts.
- **Richer audio (A1):** noise-burst explosion on game over, a distinct "break" alarm,
  and a looping **klaxon alarm** while health is near the death line.
### Changed
- **Cockpit polish (A2):** LED-style inset value readouts, a scanline on the command
  readout (first step; more in the backlog).

## [0.6.1] - 2026-09-22
### Changed
- Fewer tiles per panel (now 5-6, was up to 10). Like the original, each panel keeps a
  small number of large, readable controls; difficulty comes from the presets
  (timing/drain), not from cramming more tiles. With the one-screen layout the few tiles
  now fill the screen and stay large.

## [0.6.0] - 2026-09-22
### Changed
- Game screen now fits a single viewport (no scrolling) on small phones like the
  iPhone 13 mini: the panel fills the remaining height and tiles auto-size to fit.
- Cockpit visual pass: metal instrument tiles with corner rivets, glowing readouts,
  a ">"-prompted command with amber glow, a subtle starfield background, stronger
  damage flash.
### Added
- Feedback webhook also supports plain-text targets (e.g. ntfy.sh) alongside
  Discord/Slack JSON, so feedback can be pushed to a persistent inbox.

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
