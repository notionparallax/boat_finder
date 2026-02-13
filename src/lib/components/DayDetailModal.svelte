<script>
  import { availabilityApi } from "$lib/api/client.js";
  import { toast } from "$lib/stores/toast";
  import { formatDateDisplay } from "$lib/utils/dateHelpers.js";
  import { sortDiversByDepth } from "$lib/utils/depthColors.js";
  import { Phone } from "lucide-svelte";
  import { onMount } from "svelte";

  let { date, onClose } = $props();

  let allDivers = $state([]);
  let minDepth = $state(null);
  let loading = $state(true);
  let modalElement = $state(null);

  // Computed filtered divers based on minDepth
  let divers = $derived(
    minDepth 
      ? allDivers.filter(diver => diver.maxDepth >= minDepth)
      : allDivers
  );

  onMount(() => {
    loadDivers();

    // Focus trap and escape key handler
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "";
    };
  });

  async function loadDivers() {
    loading = true;
    const data = await availabilityApi.getDayDetails(date);
    // API returns { date, divers } - extract the divers array
    allDivers = sortDiversByDepth(data.divers || []);
    loading = false;
  }

  function copyPhoneNumbers() {
    const numbers = divers.map((d) => d.phone).join(", ");
    navigator.clipboard.writeText(numbers);
    toast.success("Phone numbers copied to clipboard!");
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<div
  class="modal-backdrop"
  onclick={handleBackdropClick}
  onkeydown={(e) => e.key === "Escape" && onClose()}
  role="presentation"
  bind:this={modalElement}
>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="modal-header">
      <h2 id="modal-title">{formatDateDisplay(new Date(date))}</h2>
      <button class="close-button" onclick={onClose} aria-label="Close modal"
        ><span>×</span></button
      >
    </div>

    <div class="modal-body">
      <div class="filters">
        <label>
          Min Depth:
          <select bind:value={minDepth}>
            <option value={null}>All divers</option>
            <option value={30}>30m+</option>
            <option value={45}>45m+</option>
            <option value={50}>50m+</option>
            <option value={60}>60m+</option>
            <option value={70}>70m+</option>
            <option value={80}>80m+</option>
            <option value={90}>90m+</option>
            <option value={100}>100m</option>
          </select>
        </label>

        <button class="copy-button" onclick={copyPhoneNumbers}>
          Copy Phone Numbers
        </button>
      </div>

      {#if loading}
        <p>Loading...</p>
      {:else if divers.length === 0}
        <p>No divers available for this day.</p>
      {:else}
        <div class="divers-list">
          <div class="list-header">
            <span>Name</span>
            <span>Cert</span>
            <span>Depth</span>
            <span>Contact</span>
          </div>
          {#each divers as diver}
            <div class="diver-row">
              <div class="diver-info">
                {#if diver.photoUrl}
                  <img
                    src={diver.photoUrl}
                    alt={diver.firstName}
                    class="avatar"
                  />
                {:else}
                  <div class="avatar-placeholder">{diver.firstName[0]}</div>
                {/if}
                <span class="name-depth">
                  <span class="name">{diver.firstName} {diver.lastName}</span>
                  <span class="depth">{diver.maxDepth}m</span>
                </span>
              </div>
              <span class="cert">{diver.certLevel}</span>
              <span class="depth-desktop">{diver.maxDepth}m</span>
              <a href="tel:{diver.phone}" class="phone-link">
                <Phone size={16} />
                {diver.phone}
              </a>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-lg);
  }

  .modal {
    background: white;
    border-radius: var(--radius-lg);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    color: var(--text-on-calendar);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .modal-header h2 {
    margin: 0;
    color: var(--text-on-calendar);
  }

  .close-button {
    font-size: 1.5rem;
    color: var(--bg-gradient-start);
    line-height: 1;
    padding: 0;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 2px solid
      color-mix(in srgb, var(--bg-gradient-start) 30%, transparent);
    background: color-mix(in srgb, var(--bg-gradient-start) 8%, transparent);
    transition: all 0.2s;
  }

  .close-button:hover {
    background-color: color-mix(
      in srgb,
      var(--bg-gradient-start) 15%,
      transparent
    );
    border-color: color-mix(in srgb, var(--bg-gradient-start) 50%, transparent);
  }

  .close-button:active {
    background-color: color-mix(
      in srgb,
      var(--bg-gradient-start) 25%,
      transparent
    );
  }
  .close-button span {
    display: block;
    transform: translateY(-1px);
  }

  .modal-body {
    padding: var(--spacing-lg);
    overflow-y: auto;
  }

  .filters {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
  }

  .filters label {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .filters select {
    padding: var(--spacing-sm);
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
  }

  .copy-button {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-gradient-start);
    color: white;
    border-radius: var(--radius-sm);
  }

  .divers-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .list-header {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr 1.5fr;
    gap: var(--spacing-md);
    font-weight: 600;
    padding: var(--spacing-sm);
    border-bottom: 2px solid rgba(0, 0, 0, 0.1);
  }

  .diver-row {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr 1.5fr;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-sm);
    align-items: center;
  }

  .diver-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .name-depth {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .depth {
    display: none;
  }

  .depth-desktop {
    display: block;
  }

  @media (max-width: 768px) {
    .depth {
      display: inline;
      font-weight: 600;
      color: var(--bg-gradient-start);
    }

    .depth-desktop,
    .cert {
      display: none;
    }

    .name-depth {
      flex-direction: row;
      align-items: center;
      gap: var(--spacing-sm);
    }
  }

  .avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--bg-gradient-start);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .phone-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--bg-gradient-start);
    padding: var(--spacing-sm);
    border-radius: 50%;
    margin: calc(var(--spacing-sm) * -1);
    transition: background-color 0.2s;
  }

  .phone-link:hover {
    background-color: rgba(0, 102, 204, 0.1);
  }

  @media (max-width: 768px) {
    .phone-link {
      padding: var(--spacing-md);
      margin: calc(var(--spacing-md) * -1);
      background-color: rgba(0, 102, 204, 0.05);
    }

    .phone-link:active {
      background-color: rgba(0, 102, 204, 0.15);
    }
  }

  @media (max-width: 768px) {
    .list-header,
    .diver-row {
      grid-template-columns: 1fr;
    }

    .list-header {
      display: none;
    }

    .diver-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
