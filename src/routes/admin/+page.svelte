<script>
  import { adminApi } from "$lib/api/client.js";
  import Header from "$lib/components/Header.svelte";
  import { user } from "$lib/stores/auth.js";
  import { onMount } from "svelte";

  let users = $state([]);
  let searchTerm = $state("");
  let filteredUsers = $state([]);

  $effect(() => {
    if (searchTerm) {
      filteredUsers = users.filter(
        (u) =>
          u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      filteredUsers = users;
    }
  });

  onMount(async () => {
    await loadUsers();
  });

  async function loadUsers() {
    users = await adminApi.getUsers();
    filteredUsers = users;
  }

  async function promoteToOperator(userId) {
    if (confirm("Promote this user to operator?")) {
      await adminApi.promoteOperator(userId);
      await loadUsers();
    }
  }
</script>

<svelte:head>
  <title>Admin - Boat Finder</title>
</svelte:head>

{#if $user && $user.isOperator}
  <Header user={$user} pageTitle="Admin" />
  <main id="main-content" class="container">
    <h1>Admin Panel</h1>

    <div class="search-section">
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Search users by name or email..."
        class="search-input"
      />
    </div>

    <div class="users-table">
      <div class="table-header">
        <span>Name</span>
        <span>Email</span>
        <span>Cert Level</span>
        <span>Max Depth</span>
        <span>Role</span>
        <span>Action</span>
      </div>
      {#each filteredUsers as user}
        <div class="table-row">
          <span>{user.firstName} {user.lastName}</span>
          <span>{user.email}</span>
          <span>{user.certLevel || "-"}</span>
          <span>{user.maxDepth}m</span>
          <span class="role">{user.isOperator ? "Operator" : "Diver"}</span>
          <span>
            {#if !user.isOperator}
              <button
                class="promote-button"
                onclick={() => promoteToOperator(user.userId)}
              >
                Promote to Operator
              </button>
            {:else}
              <span class="operator-badge">✓ Operator</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </main>
{:else}
  <div class="container">
    <p>Access denied. Admin only.</p>
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
    margin-bottom: var(--spacing-lg);
  }

  .search-section {
    margin-bottom: var(--spacing-lg);
  }

  .search-input {
    width: 100%;
    max-width: 500px;
    padding: var(--spacing-md);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-md);
    background: var(--calendar-bg);
    color: var(--text-on-calendar);
    font-size: 1rem;
  }

  .users-table {
    background: var(--calendar-bg);
    border-radius: var(--radius-lg);
    overflow: hidden;
    color: var(--text-on-calendar);
  }

  .table-header {
    display: grid;
    grid-template-columns: 1.5fr 2fr 1.5fr 1fr 1fr 1.5fr;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: rgba(0, 0, 0, 0.1);
    font-weight: 600;
  }

  .table-row {
    display: grid;
    grid-template-columns: 1.5fr 2fr 1.5fr 1fr 1fr 1.5fr;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    align-items: center;
  }

  .role {
    font-weight: 500;
  }

  .promote-button {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-gradient-start);
    color: white;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
  }

  .operator-badge {
    color: var(--bg-gradient-start);
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .table-header {
      display: none;
    }

    .table-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-xs);
    }
  }
</style>
