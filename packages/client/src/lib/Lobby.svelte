<script lang="ts">
  import QRCode from "qrcode";
  import { S, me, ready, start, joinUrl } from "./store.svelte";

  let qr = $state("");
  let mine = $derived(me());
  let canStart = $derived(S.players.length >= 2 && S.players.every((p) => p.ready));

  $effect(() => {
    if (S.roomId) {
      QRCode.toDataURL(joinUrl(), { margin: 1, width: 220 })
        .then((d) => (qr = d))
        .catch(() => (qr = ""));
    }
  });
</script>

<div class="lobby">
  <h1>Ready room</h1>
  <p class="hint">Others join by scanning the code - same room, no download.</p>

  <div class="join-card">
    <div class="code">{S.roomId}</div>
    {#if qr}<img class="qr" src={qr} alt="Scan to join" width="220" height="220" />{/if}
    <div class="url">{joinUrl()}</div>
  </div>

  <ul class="players">
    {#each S.players as p (p.id)}
      <li class:ready={p.ready}>
        <span>{p.name}{p.host ? " - host" : ""}{p.id === S.sessionId ? " - you" : ""}</span>
        <span>{p.ready ? "ready" : "waiting"}</span>
      </li>
    {/each}
  </ul>

  <button class="btn wide" onclick={() => ready(!mine?.ready)}>
    {mine?.ready ? "Not ready" : "I am ready"}
  </button>

  {#if mine?.host}
    <button class="btn wide primary" disabled={!canStart} onclick={start}>Start game</button>
    {#if !canStart}<p class="hint">Need at least 2 players, everyone ready.</p>{/if}
  {/if}
</div>