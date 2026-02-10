<script>
  import { availabilityApi } from "$lib/api/client.js";
  import { formatDateDisplay } from "$lib/utils/dateHelpers.js";
  import { sortDiversByDepth } from "$lib/utils/depthColors.js";
  import { Phone } from "lucide-svelte";
  import { onMount } from "svelte";

  let { date, onClose } = $props();

  let divers = $state([]);
  let loading = $state(true);
  let minDepth = $state(null);
  let modalElement = $state(null);

  onMount(async () => {
    await loadDivers();

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
    const data = await availabilityApi.getDayDetails(date, minDepth);
    divers = sortDiversByDepth(data);
    loading = false;
  }

  function handleFilterChange() {
    loadDivers();
  }

  function copyPhoneNumbers() {
    const numbers = divers.map((d) => d.phone).join(", ");
    navigator.clipboard.writeText(numbers);
    alert("Phone numbers copied to clipboard!");
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
        >×</button
      >
    </div>

    <div class="modal-body">
      <div class="filters">
        <label>
          Min Depth:
          <select bind:value={minDepth} onchange={handleFilterChange}>
            <option value={null}>All divers</option>
            <option value="45">45m+</option>
            <option value="50">50m+</option>
            <option value="60">60m+</option>
            <option value="70">70m+</option>
            <option value="80">80m+</option>
            <option value="90">90m+</option>
            <option value="100">100m</option>
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
                <span>{diver.firstName} {diver.lastName}</span>
              </div>
              <span class="cert">{diver.certLevel}</span>
              <span class="depth">{diver.maxDepth}m</span>
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
    font-size: 2rem;
    color: var(--text-on-calendar);
    line-height: 1;
    padding: 0;
    width: 2rem;
    height: 2rem;
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
