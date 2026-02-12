<script>
  import ToastContainer from "$lib/components/ToastContainer.svelte";
  import "../app.css";

  let { children } = $props();
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<ToastContainer />

<div class="app">
  {@render children()}
</div>

<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--bg-gradient-start);
    color: white;
    padding: var(--spacing-sm) var(--spacing-md);
    text-decoration: none;
    border-radius: 0 0 4px 0;
    z-index: 9999;
  }

  .skip-link:focus {
    top: 0;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
