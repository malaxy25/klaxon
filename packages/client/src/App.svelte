<script lang="ts">
  import { onMount } from "svelte";
  import { S, joinByCode, openHelp, initMotion } from "./lib/store.svelte";
  import Home from "./lib/Home.svelte";
  import Lobby from "./lib/Lobby.svelte";
  import Game from "./lib/Game.svelte";
  import GameOver from "./lib/GameOver.svelte";
  import Connecting from "./lib/Connecting.svelte";
  import Help from "./lib/Help.svelte";
  import EventOverlay from "./lib/EventOverlay.svelte";

  onMount(() => {
    initMotion();
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

{#if S.eventType}<EventOverlay />{/if}
{#if S.eventResult}
  <div class="ev-result {S.eventResult}">{S.eventResult === "passed" ? "SURVIVED" : "HULL BREACH"}</div>
{/if}
{#if S.reconnecting}<div class="reconnect-overlay"><div class="rc-box">Reconnecting...</div></div>{/if}
{#if S.connecting}<Connecting />{/if}
{#if S.showHelp}<Help />{/if}
