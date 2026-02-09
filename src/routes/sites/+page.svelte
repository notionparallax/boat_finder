<script>
  import { sitesApi } from "$lib/api/client.js";
  import Header from "$lib/components/Header.svelte";
  import { user } from "$lib/stores/auth.js";
  import { MapPin } from "lucide-svelte";
  import { onMount } from "svelte";

  let currentUser = $state(null);
  let sites = $state([]);
  let showAddForm = $state(false);
  let newSite = $state({ name: "", depth: "", latitude: "", longitude: "" });

  $effect(() => {
    currentUser = $user;
  });

  onMount(async () => {
    await loadSites();
  });

  async function loadSites() {
    sites = await sitesApi.getAll();
  }

  async function toggleInterest(siteId) {
    await sitesApi.toggleInterest(siteId);
    await loadSites();
  }

  async function handleSubmit() {
    await sitesApi.createSite({
      name: newSite.name,
      depth: parseFloat(newSite.depth),
      latitude: parseFloat(newSite.latitude),
      longitude: parseFloat(newSite.longitude),
    });
    newSite = { name: "", depth: "", latitude: "", longitude: "" };
    showAddForm = false;
    await loadSites();
  }
</script>

<svelte:head>
  <title>Dive Sites - Boat Finder</title>
</svelte:head>

{#if currentUser}
  <Header user={currentUser} />
  <main class="container">
    <div class="header-section">
      <h1>Dive Sites</h1>
      <button class="add-button" onclick={() => (showAddForm = !showAddForm)}>
        {showAddForm ? "Cancel" : "+ Add Site"}
      </button>
    </div>

    {#if showAddForm}
      <form class="add-form" onsubmit|preventDefault={handleSubmit}>
        <input
          type="text"
          bind:value={newSite.name}
          placeholder="Site Name"
          required
        />
        <input
          type="number"
          bind:value={newSite.depth}
          placeholder="Depth (m)"
          required
        />
        <input
          type="number"
          step="0.000001"
          bind:value={newSite.latitude}
          placeholder="Latitude"
          required
        />
        <input
          type="number"
          step="0.000001"
          bind:value={newSite.longitude}
          placeholder="Longitude"
          required
        />
        <button type="submit" class="submit-button">Add Site</button>
      </form>
    {/if}

    <div class="sites-grid">
      {#each sites as site}
        <div class="site-card">
          <div class="site-header">
            <h3>{site.name}</h3>
            <button
              class="interest-button"
              class:interested={site.userInterested}
              onclick={() => toggleInterest(site.siteId)}
            >
              {site.userInterested ? "★" : "☆"}
            </button>
          </div>
          <div class="site-info">
            <p><strong>Depth:</strong> {site.depth}m</p>
            <p>
              <MapPin size={14} />
              {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
            </p>
            <p class="interest-count">
              {site.interestCount} diver{site.interestCount !== 1 ? "s" : ""} interested
            </p>
          </div>
        </div>
      {/each}
    </div>
  </main>
{/if}

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-xl);
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
  }

  h1 {
    font-size: 2rem;
  }

  .add-button {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--calendar-bg);
    color: var(--text-on-calendar);
    border-radius: var(--radius-md);
    font-weight: 600;
  }

  .add-form {
    background: var(--calendar-bg);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    color: var(--text-on-calendar);
  }

  .add-form input {
    padding: var(--spacing-sm);
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
  }

  .submit-button {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--bg-gradient-start);
    color: white;
    border-radius: var(--radius-sm);
    font-weight: 600;
  }

  .sites-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .site-card {
    background: var(--calendar-bg);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    color: var(--text-on-calendar);
  }

  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: var(--spacing-md);
  }

  .site-header h3 {
    margin: 0;
    font-size: 1.2rem;
  }

  .interest-button {
    font-size: 1.5rem;
    padding: 0;
    color: rgba(0, 0, 0, 0.3);
    transition: color 0.2s;
  }

  .interest-button.interested {
    color: #ffd700;
  }

  .site-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .site-info p {
    margin: 0;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .interest-count {
    color: var(--bg-gradient-start);
    font-weight: 600;
    margin-top: var(--spacing-sm);
  }
</style>
