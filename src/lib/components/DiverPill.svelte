<script>
  import { getDepthColor } from "$lib/utils/depthColors.js";

  let { diver } = $props();
</script>

<span class="pill" style="background-color: {getDepthColor(diver.maxDepth)}">
  {diver.firstName}
</span>

<style>
  .pill {
    padding: 2px 6px;
    border-radius: var(--radius-pill);
    font-size: 0.7rem;
    color: white;
    white-space: nowrap;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
</style>
