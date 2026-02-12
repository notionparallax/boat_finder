<script>
  import { goto } from "$app/navigation";
  import { auth } from "$lib/firebase";
  import { logger } from "$lib/utils/logger";
  import { signOut } from "firebase/auth";
  import { Menu, Plus, X } from "lucide-svelte";

  let { user: currentUser, pageTitle = "", onAddClick = null } = $props();
  let mobileMenuOpen = $state(false);

  async function handleLogout() {
    try {
      await signOut(auth);
      goto("/");
    } catch (error) {
      logger.error("Error signing out:", error);
    }
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<header class="header">
  <div class="header-content">
    <div class="logo-section">
      <h1 class="logo">
        Boat Finder{#if pageTitle}: {pageTitle}{/if}
      </h1>
    </div>

    <!-- Mobile hamburger button -->
    <button
      class="mobile-menu-button"
      onclick={toggleMobileMenu}
      aria-label="Menu"
    >
      {#if mobileMenuOpen}
        <X size={24} />
      {:else}
        <Menu size={24} />
      {/if}
    </button>

    <!-- Desktop navigation -->
    <nav class="desktop-nav">
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

  <!-- Mobile menu overlay -->
  {#if mobileMenuOpen}
    <div
      class="mobile-menu-overlay"
      onclick={closeMobileMenu}
      onkeydown={(e) => e.key === "Escape" && closeMobileMenu()}
      role="button"
      tabindex="-1"
      aria-label="Close menu"
    ></div>
    <nav class="mobile-nav">
      {#if onAddClick}
        <button
          onclick={() => {
            onAddClick();
            closeMobileMenu();
          }}
          class="mobile-nav-item add-button"
        >
          <Plus size={20} />
          <span>Add Site</span>
        </button>
      {/if}
      <a href="/" onclick={closeMobileMenu} class="mobile-nav-item">Calendar</a>
      <a href="/sites" onclick={closeMobileMenu} class="mobile-nav-item"
        >Dive Sites</a
      >
      <a href="/profile" onclick={closeMobileMenu} class="mobile-nav-item"
        >Profile</a
      >
      {#if currentUser.isOperator}
        <a href="/admin" onclick={closeMobileMenu} class="mobile-nav-item"
          >Admin</a
        >
      {/if}
      <button
        onclick={() => {
          handleLogout();
          closeMobileMenu();
        }}
        class="mobile-nav-item logout-button"
      >
        Logout
      </button>
      {#if currentUser.photoURL}
        <div class="mobile-user-info">
          <img
            src={currentUser.photoURL}
            alt={currentUser.displayName || currentUser.email}
            class="profile-photo"
          />
          <span>{currentUser.firstName || currentUser.email}</span>
        </div>
      {/if}
    </nav>
  {/if}
</header>

<style>
  .header {
    background: rgba(0, 0, 0, 0.2);
    padding: var(--spacing-xs) var(--spacing-lg);
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

  .mobile-menu-button {
    display: none;
    background: none;
    border: none;
    color: var(--text-on-background);
    cursor: pointer;
    padding: var(--spacing-md);
    margin: calc(var(--spacing-sm) * -1);
    min-width: 48px;
    min-height: 48px;
  }

  .desktop-nav {
    display: flex;
    gap: var(--spacing-lg);
    align-items: center;
  }

  .desktop-nav a,
  .desktop-nav .logout-button {
    color: var(--text-on-background);
    transition: opacity 0.2s;
    padding: var(--spacing-sm);
    min-height: 44px;
    display: flex;
    align-items: center;
    text-decoration: none;
  }

  .desktop-nav .logout-button {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
  }

  .desktop-nav a:hover,
  .desktop-nav .logout-button:hover {
    opacity: 0.8;
  }

  .mobile-menu-overlay {
    display: none;
  }

  .mobile-nav {
    display: none;
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
      flex-direction: row;
      justify-content: space-between;
    }

    .mobile-menu-button {
      display: block;
    }

    .desktop-nav {
      display: none;
    }

    .mobile-menu-overlay {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }

    .mobile-nav {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 280px;
      max-width: 80vw;
      background: white;
      z-index: 1000;
      padding: var(--spacing-xl);
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.3);
      overflow-y: auto;
    }

    .mobile-nav-item {
      padding: var(--spacing-md);
      color: var(--text-primary);
      text-decoration: none;
      border-bottom: 1px solid var(--border-color);
      min-height: 48px;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      background: none;
      border: none;
      font-size: 1rem;
      text-align: left;
      width: 100%;
      cursor: pointer;
    }

    .mobile-nav-item:hover {
      background: var(--bg-hover);
    }

    .mobile-nav-item.add-button {
      background: var(--calendar-bg);
      color: var(--text-on-calendar);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-md);
      justify-content: center;
    }

    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      margin-top: auto;
      border-top: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .profile-photo {
      width: 28px;
      height: 28px;
    }
  }
</style>
