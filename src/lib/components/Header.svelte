<script>
  let { user: currentUser } = $props();
</script>

<header class="header">
  <div class="header-content">
    <h1 class="logo">Boat Finder</h1>
    <nav>
      <a href="/">Calendar</a>
      <a href="/sites">Dive Sites</a>
      <a href="/profile">Profile</a>
      {#if currentUser.isOperator}
        <a href="/admin">Admin</a>
      {/if}
      <a href="/.auth/logout">Logout</a>
    </nav>
  </div>
</header>

<style>
  .header {
    background: rgba(0, 0, 0, 0.2);
    padding: var(--spacing-md) var(--spacing-lg);
    color: var(--text-on-background);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  nav {
    display: flex;
    gap: var(--spacing-lg);
  }

  nav a {
    color: var(--text-on-background);
    transition: opacity 0.2s;
  }

  nav a:hover {
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      gap: var(--spacing-md);
    }

    nav {
      gap: var(--spacing-md);
      font-size: 0.9rem;
    }
  }
</style>
