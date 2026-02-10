<script>
  import { auth } from "$lib/firebase";
  import { signOut } from "firebase/auth";
  import { Plus } from "lucide-svelte";

  let { user: currentUser, pageTitle, onAddClick } = $props();

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }
</script>

<header class="header">
  <div class="header-content">
    <div class="logo-section">
      <h1 class="logo">
        Boat Finder{#if pageTitle}: {pageTitle}{/if}
      </h1>
    </div>
    <nav>
      {#if onAddClick}
        <button onclick={onAddClick} class="add-button" title="Add Site">
          <Plus size={20} />
          <span class="add-text">Add Site</span>
        </button>
      {/if}
      <a href="/">Calendar</a>
      <a href="/sites">Dive Sites</a>
      <a href="/profile">Profile</a>
      {#if currentUser.isOperator}
        <a href="/admin">Admin</a>
      {/if}
      {#if currentUser.photoURL}
        <img
          src={currentUser.photoURL}
          alt={currentUser.displayName || currentUser.email}
          class="profile-photo"
        />
      {/if}
      <button onclick={handleLogout} class="logout-button">Logout</button>
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

  .logo-section {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .add-button {
    background: var(--calendar-bg);
    color: var(--text-on-calendar);
    border: none;
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--radius-md);
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    transition: opacity 0.2s;
  }

  .add-button:hover {
    opacity: 0.9;
  }

  nav {
    display: flex;
    gap: var(--spacing-lg);
    align-items: center;
  }

  nav a,
  .logout-button {
    color: var(--text-on-background);
    transition: opacity 0.2s;
  }

  .logout-button {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    padding: 0;
  }

  nav a:hover,
  .logout-button:hover {
    opacity: 0.8;
  }

  .profile-photo {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--text-on-background);
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

    .profile-photo {
      width: 28px;
      height: 28px;
    }
  }
</style>
