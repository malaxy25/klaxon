<script lang="ts">
  import { S, me, playAgain } from "./store.svelte";
  let mine = $derived(me());
</script>

<div class="over">
  <h1>Game over</h1>
  <p class="tagline">You reached sector {S.level}. The ship is space dust.</p>

  {#if mine?.host}
    <button class="btn wide primary" onclick={playAgain}>Play again</button>
    <p class="hint">Back to the ready room - everyone stays in.</p>
  {:else}
    <p class="hint">Waiting for the host to start a new round...</p>
  {/if}

  <button class="btn wide" onclick={() => (location.href = location.pathname)}>Leave</button>
</div>
