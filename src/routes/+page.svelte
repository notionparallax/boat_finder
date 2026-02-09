<script>
  import Calendar from "$lib/components/Calendar.svelte";
  import Header from "$lib/components/Header.svelte";
  import { user } from "$lib/stores/auth.js";

  let currentUser = $state(null);

  $effect(() => {
    currentUser = $user;
  });
</script>

<svelte:head>
  <title>Boat Finder - Sydney Tech Diving</title>
</svelte:head>

{#if currentUser}
  <Header user={currentUser} />
  <main class="container">
    <h1>Dive Availability Calendar</h1>
    <p class="subtitle">Click days to indicate when you're available to dive</p>
    <Calendar />
  </main>
{:else}
  <div class="login-container">
    <div class="login-card">
      <h1>Boat Finder</h1>
      <p>Sydney Tech Diving Availability Coordinator</p>
      <div class="login-buttons">
        <a href="/.auth/login/google?post_login_redirect_uri=https://blue-plant-03e9b1700.6.azurestaticapps.net/" class="login-button">
          <span>Sign in with Google</span>
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-xl);
  }

  h1 {
    font-size: 2rem;
    margin-bottom: var(--spacing-sm);
  }

  .subtitle {
    font-size: 1.1rem;
    margin-bottom: var(--spacing-xl);
    opacity: 0.9;
  }

  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--spacing-lg);
  }

  .login-card {
    background: var(--calendar-bg);
    color: var(--text-on-calendar);
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  .login-card h1 {
    color: var(--text-on-calendar);
    margin-bottom: var(--spacing-md);
  }

  .login-card p {
    color: var(--text-on-calendar);
    margin-bottom: var(--spacing-xl);
  }

  .login-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .login-button {
    display: block;
    padding: var(--spacing-md);
    background: var(--bg-gradient-start);
    color: white;
    border-radius: var(--radius-md);
    text-decoration: none;
    transition:
      transform 0.2s,
      opacity 0.2s;
  }

  .login-button:hover {
    transform: translateY(-2px);
    opacity: 0.9;
  }
</style>
