<script>
  import { goto } from "$app/navigation";
  import { user } from "$lib/stores/auth";
  import { onMount } from "svelte";

  let { children } = $props();

  // Redirect to home if not authenticated
  onMount(() => {
    if (!$user) {
      goto("/");
    }
  });
</script>

{#if $user}
  {@render children()}
{/if}
