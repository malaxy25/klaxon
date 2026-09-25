<script lang="ts">
  import { onMount } from "svelte";
  import { S, joinByCode, openHelp, initMotion, initDebug, applyAmbient, unlockAudio, toggleMute } from "./lib/store.svelte";
  import Home from "./lib/Home.svelte";
  import Lobby from "./lib/Lobby.svelte";
  import Game from "./lib/Game.svelte";
  import GameOver from "./lib/GameOver.svelte";
  import Connecting from "./lib/Connecting.svelte";
  import Help from "./lib/Help.svelte";
  import EventOverlay from "./lib/EventOverlay.svelte";
  import Debug from "./lib/Debug.svelte";
  import SectorOverlay from "./lib/SectorOverlay.svelte";

  onMount(() => {
    initMotion();
    initDebug();
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    const r = new URLSearchParams(location.search).get("r");
    if (r) {
      joinByCode(r);
    } else {
      try {
        if (!localStorage.getItem("klaxon_seen_help")) {
          openHelp();
          localStorage.setItem("klaxon_seen_help", "1");
        }
      } catch { /* ignore */ }
    }
  });

  $effect(() => { void S.screen; void S.muted; applyAmbient(); });
</script>

{#if S.screen === "home"}
  <Home />
{:else if S.screen === "lobby"}
  <Lobby />
{:else if S.screen === "game"}
  <Game />
{:else}
  <GameOver />
{/if}

{#if S.screen !== "game"}<button class="mute-fab" onclick={toggleMute} aria-label="Toggle sound">{S.muted ? "unmute" : "mute"}</button>{/if}
{#if S.intermission}<SectorOverlay />{/if}
{#if S.eventType}<EventOverlay />{/if}
{#if S.eventResult}
  <div class="ev-result {S.eventResult}">{S.eventResult === "passed" ? "SURVIVED" : "HULL BREACH"}</div>
{/if}
{#if S.reconnecting}<div class="reconnect-overlay"><div class="rc-box">Reconnecting...</div></div>{/if}
{#if S.connecting}<Connecting />{/if}
{#if S.showHelp}<Help />{/if}
{#if S.debug}<Debug />{/if}
