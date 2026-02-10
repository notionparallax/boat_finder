<script>
  import ToastContainer from "$lib/components/ToastContainer.svelte";
  import "../app.css";

  let { children } = $props();
</script>

<ToastContainer />

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
