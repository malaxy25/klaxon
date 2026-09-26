# Changelog

All notable changes to Klaxon. Format loosely follows Keep a Changelog; versioning is
informal for a hobby project.

## [0.8.37] - 2026-09-25
### Changed
- **Rewire reworked:** instead of a swipe (too similar to slime), a **loose plug** dangles
  and you **drag it into the glowing socket** (socket position varies per tile). Miss =
  snaps back, no penalty.
- **Hazard/size mapping:** each hazard has a minimum tile size; **rewire only appears on
  tiles >= 2x1** (room for plug + socket). Hazards are now picked fairly (pick the hazard,
  then a fitting tile), so rewire shows up regularly.

## [0.8.36] - 2026-09-25
### Added
- Two more hazards complete the set: **Overheat** (glows red - **don't touch**, it cools
  down on its own after ~4 s) and **Loose wiring / Rewire** (**drag across** the tile to
  reconnect). Each with its own look and sound. How-to-play updated.
- Full hazard set now: jammed (hold), slime (swipe), frozen (tap), short-circuit (hold),
  overheat (wait), rewire (drag).

## [0.8.35] - 2026-09-25
### Changed
- **Dial redesign:** numbers sit **around a ring** - **tap a number or turn** to set it; a
  long pointer so your finger does not cover the value; bigger **2x2** tile.
- **Zoom disabled** (viewport) so rapid tapping (e.g. clearing a frozen panel) no longer
  zooms the page in.
- Control labels a touch larger; the sector **warp animation** made bolder/robust on mobile.

## [0.8.34] - 2026-09-25
### Added
- **New control type: Dial** - a knob you set by dragging up/down ("Turn X to N").
- **Two new hazards:** **Frozen** (tap 4x to free) and **Electro / short-circuit** (hold to
  stabilize), each with its own look and sound.
- The **sector-cleared** screen shows a fun line using player names/stats
  (e.g. "X is carrying the crew").
- Debug: Freeze-ctl / Electro hazard buttons; `debug:hazard` honours the kind.
### Note
- **Overheat** (self-cooldown) and **Rewire** (drag A->B) hazards are coming next.

## [0.8.33] - 2026-09-25
### Added
- **Sector intermission:** between sectors the game now pauses (~8 s, no drain / events /
  breaks) and plays a short **WARP** screen ("SECTOR N CLEARED -> WARP TO N+1") with a
  fanfare + vibration. **Tap to continue** any time; it auto-advances otherwise.

## [0.8.32] - 2026-09-25
### Added
- Debug: a **Freeze** button next to the health/flow controls (pauses drain, events and
  breaks) so you can inspect actions and effects in peace.
- **Buy-me-a-coffee** link in the lobby footer too.
- A small **leave** button in the game HUD and a **Leave room** link in the lobby to get
  back to the start screen.

## [0.8.31] - 2026-09-25
### Added
- Device log now also records **orientation** (portrait/landscape) and **pwa** (launched
  from the home screen as an installed app, yes/no). Update the Apps Script - see docs/STATS.md.
- (Includes the reliable cumulative slime-wipe from 0.8.30.)

## [0.8.30] - 2026-09-25
### Fixed
- **Wiping alien slime now works reliably on iOS.** Rebuilt with native touch events
  (pointer events were flaky on iOS) and made **cumulative**: keep swiping/scrubbing
  anywhere - progress adds up and only fades after ~1.5 s idle, so edge tiles and short
  strokes work. A tap also counts as a small wipe (fallback). "Hold to fix" only cancels
  on release (not on finger movement).

## [0.8.29] - 2026-09-25
### Fixed
- **Wiping slime / holding to fix on edge tiles:** the gestures now attach to the window,
  so they capture movement across the whole screen no matter where the tile sits (pointer
  capture was unreliable on iOS). You can also just scrub back and forth in place; the
  needed distance was lowered.

## [0.8.28] - 2026-09-25
### Fixed
- Device and feedback rows logged an empty **room** column (the field was named `code`
  while the sheet reads `room`). Unified to `room` - the code now appears. `rid` was always
  present, so nothing was lost.

## [0.8.27] - 2026-09-24
### Fixed
- **Joining by code/QR no longer waits ~70 s before failing.** If the room is not found
  (host closed it, server restarted, or wrong code) it now fails fast with a clearer
  message ("... is the room still open on the host?"). Only genuine connection problems
  get a short (~20 s) retry.

## [0.8.26] - 2026-09-24
### Added
- **Device log** (Devices tab): OS class (ios/android/desktop) + screen size (w/h/dpr) per
  join. No model/UA.
- **Join key across all logs:** unique `rid` (roomId) in usage, device and feedback; a
  per-player `pid` in device and feedback - so Feedback/Usage/Device can be linked
  (rid = same game, pid = same device).
### Changed
- Feedback sent to a webhook now carries structured fields (rid/pid/msg). Update the Apps
  Script to route into Usage / Devices / Feedback tabs (see docs/STATS.md). ntfy push text
  is unchanged.

## [0.8.25] - 2026-09-24
### Added
- Usage log now records **start sector** and **end sector** separately, plus **motion** -
  how many of the crew had gyro/tilt enabled at start. (Update the Apps Script - see docs/STATS.md.)
- **Buy-me-a-coffee link** (discreet) in the home footer and on the game-over screen.

## [0.8.24] - 2026-09-24
### Fixed
- Usage log: the **end** row now fires reliably at **game over** (not at room disposal),
  with `players`, `peak`, `sector` reached and `durationSec`. **start** carries `players`
  and the starting `sector`. Columns unified: timestamp, event, room, players, peak,
  sector, durationSec (update the Apps Script - see docs/STATS.md).

## [0.8.23] - 2026-09-24
### Added
- **Persistent usage log (optional):** if the server env `STATS_WEBHOOK` is set, the server
  posts one JSON row when a game **starts** (room, players, sector) and one when a room
  **ends** (room, peak players, duration) - e.g. into a Google Sheet "Usage" tab. No
  periodic noise. See docs/STATS.md.

## [0.8.22] - 2026-09-24
### Fixed
- The **join link no longer wraps to two lines** on small phones - it's one line with an
  ellipsis (tapping still copies the full link).
### Changed
- Clearer message when the connection actually drops (room closed or the free server went
  to sleep): prompts you to just create or join again.

## [0.8.21] - 2026-09-24
### Added
- **Cockpit polish:** subtle CRT scanline + vignette over the game, and the sector readout
  is now an inset amber chip.
- **Optional debug lock:** if the server env `DEBUG_KEY` is set, the debug panel only
  unlocks via `?debug=<KEY>`. When it's not set (private / friends use) debug stays
  host-gated as before - nothing to configure.
### Changed
- CI actions bumped to v5 (removes the Node 20 deprecation warning).

## [0.8.20] - 2026-09-24
### Added
- **Per-device panel sizing:** each player reports their screen height on join and the
  server caps their panel to 4 / 5 / 6 controls - small phones get fewer, roomier tiles.
- **GitHub Actions CI** (`.github/workflows/ci.yml`): builds shared + server + client on
  Node 24 on every push, catching breakage before you rely on the deploy.
### Fixed
- **Control labels can no longer be clipped:** the label sits in its own row that is
  always shown; the control area shrinks first if space is tight.
### Changed
- BACKLOG: noted securing the debug panel before any public launch (P6).

## [0.8.19] - 2026-09-24
### Fixed
- **Wiping off alien slime** (and **holding to fix** a jammed control) could not be
  completed on narrow tiles: the gesture cancelled the moment your finger left the small
  tile. It now uses **pointer capture**, so you can swipe/hold across the whole screen;
  slime threshold lowered a touch.

## [0.8.18] - 2026-09-24
### Fixed
- **Small / short screens were too cramped** - control labels got clipped and overlapped
  by the tile below. Tiles are now more compact (tighter spacing, smaller readouts / ticks
  / labels) with an extra-compact mode on short screens, so labels stay readable.
- Shorter slime prompt ("WIPE / IT OFF") so it fits narrow tiles.

## [0.8.17] - 2026-09-24
### Changed
- **How-to-play** now covers the new alerts in a short block: jammed controls (hold to
  fix), alien slime (wipe off), and full-screen team events (shake / flip / hold / tap -
  or don't touch).

## [0.8.16] - 2026-09-23
### Added
- **docs/AI-CONTEXT.md** - onboarding for a future AI (architecture, workflow, and what a
  deployment consists of) and **docs/MAINTENANCE.md** - keeping libraries, Node and the
  deploy up to date.
- **package-lock.json** and the **Dockerfile** are now part of the repo snapshot for
  reproducible builds.
### Changed
- Server container bumped to **Node 24** (Dockerfile: `FROM node:24-alpine`).

## [0.8.15] - 2026-09-23
### Added
- **Mute button on the home, lobby and game-over screens** too (top-right) - since those
  now have music. In-game the mute stays in the HUD.

## [0.8.14] - 2026-09-23
### Added
- **Two music modes:** a calm loop on the home / lobby / game-over screens that switches
  to the driving loop when a round starts (and back afterwards). Audio unlocks on the
  first tap. The Sound Lab now has both loops as separate buttons.

## [0.8.13] - 2026-09-23
### Changed
- **Ambient loop is now driving:** a pulsing synth-bass (Am, with a downbeat pulse) that
  **speeds up each sector** - more drive as it gets harder. Replaces the calm melody.

## [0.8.12] - 2026-09-23
### Fixed
- **Ambient loop was inaudible** (sub-bass ~55 Hz that phone speakers can't reproduce).
  Replaced with a soft, spacey **looping melody** (Am/F arpeggio) in an audible range.

## [0.8.11] - 2026-09-23
### Added
- **Sound preview in the debug panel:** a "Sounds" section to play every sound (hazards,
  commands, events, game over) and toggle the ambient loop, klaxon alarm, and mute -
  always on hand for tuning. (Also available as a standalone Sound Lab page.)

## [0.8.10] - 2026-09-23
### Added
- **Tap the join link** under the QR code to copy it to the clipboard ("Link copied!").
- **Ambient background hum** during play, plus **distinct sounds per hazard** (a
  mechanical buzz for a jammed panel, a wet squelch for alien slime). All respect Mute.

## [0.8.9] - 2026-09-23
### Fixed
- **Health bar now shows the survival margin** (how far you are above the rising death
  line): empty = game over, full = next sector. Before it showed raw health with a
  separate death-line layer, so the bar looked "not empty" when you died.
- **Hazard prompts** ("HOLD TO FIX" / "ALIEN GOO - WIPE IT OFF") now sit on a dark chip,
  so they are readable over the busy hazard patterns.

## [0.8.8] - 2026-09-23
### Added
- Turn on the debug panel without the URL: **tap the version in the Home footer 5x** to
  toggle debug mode (tap once more while on to turn it off). It is remembered, so `?debug`
  is no longer needed; a small "debug" marker shows in the footer when active.

## [0.8.7] - 2026-09-23
### Added
- **In-game debug panel (host):** open any game with `?debug` in the URL to get a floating
  DEBUG button. From there: trigger any event, break/slime/clear panels, +/-20 health, jump
  a sector, force game over, solve your (or all) commands, force-start solo, reveal the
  answer to your command, and pause. No server env vars needed for testing anymore.
- **Live server stats** in that panel: active rooms, total players, uptime, memory (RSS/heap).

## [0.8.6] - 2026-09-23
### Changed
- **Wormhole now really swaps panels between players (permanently).** After it, you
  control someone else's board - you have to re-orient and shout differently. (Was a
  local shuffle before.) For 2 players it's a straight swap; for more, a rotation.

## [0.8.5] - 2026-09-23
### Fixed
- Special-event taps (Brace / Wormhole and the tap fallback) sometimes did not register
  on iOS because rapid taps triggered double-tap zoom - so the event seemed stuck. Buttons
  now use `touch-action: manipulation` + pointer events, and tap events need only **3**
  taps. (Events also always auto-resolve after their ~6 s timer, so they can never hang.)
### Added
- Dev: `FORCE_EVENT` env var on the server to force a specific event type while testing.

## [0.8.4] - 2026-09-23
### Added
- Up to **8 players** per room (was 4). Rooms run in parallel, each with its own code.
- **Host can remove a player** from the room (e.g. someone stuck offline) - an "x" next
  to each other player in the lobby.
- Disconnected players show as **offline** (greyed) in the lobby; a dropped player no
  longer ends the round unless fewer than 2 remain.
### Changed
- Cockpit polish: **PRESS** buttons are red dome buttons, selector options look like
  inset LED cells, and the panel sits in a framed metal dashboard.

## [0.8.3] - 2026-09-22
### Added
- Three more special events: **Power surge** (hold), **Decompression** (do NOT touch
  until the timer ends), **Wormhole** (your panel gets scrambled - tap to stabilize).
- **Reconnect (P1):** a dropped connection (phone locks, WiFi blip) no longer ends the
  round - the seat is held ~30 s and the client rejoins automatically; a "Reconnecting"
  overlay shows meanwhile.
- **PWA (P3):** installable to the home screen (web manifest + service worker + Apple
  touch meta), standalone display.

## [0.8.2] - 2026-09-22
### Added
- New hazard: **alien slime** - a random control gets slimed and must be **wiped off**
  (swipe across it) to clear it, alongside the existing jammed panels (hold to fix).
  Each hazard has its own look and sound.
### Changed
- Cockpit polish: toggles render as physical **flip switches**, and sliders show
  **numbered ticks** (0..max) above the track.

## [0.8.1] - 2026-09-22
### Fixed
- Host name entered on Home is applied immediately now (passed as a join option) -
  no more "Player" until you re-enter it.
### Changed
- Motion controls are a clear setting in the lobby (next to difficulty); auto-on where
  no permission is needed (Android/desktop) and also requested on "I'm ready". An
  "Enable shake & tilt" button also appears during shake/flip events.
- Room-code input auto-capitalises.
- Browser tab title is now "Klaxon" (was "client") with a fitting favicon.
- Feedback can go to two webhooks in parallel via `FEEDBACK_WEBHOOK` and
  `FEEDBACK_WEBHOOK_2` (e.g. ntfy + Google Sheet).

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
