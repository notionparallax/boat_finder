<script>
  import "../app.css";
  import { onMount } from "svelte";
  import { user } from "$lib/stores/auth.js";
  import { goto } from "$app/navigation";

  let { children } = $props();

  onMount(async () => {
    // Check authentication status
    const response = await fetch("/api/users/me");
    if (response.ok) {
      const data = await response.json();
      user.set(data);
    }
  });
</script>

<div class="app">
  {@render children()}
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
