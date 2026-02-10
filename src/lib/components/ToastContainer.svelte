<script>
  import { toasts } from "$lib/stores/toast";
  import { fly } from "svelte/transition";
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      transition:fly={{ y: -20, duration: 300 }}
    >
      {toast.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: var(--spacing-xl);
    right: var(--spacing-xl);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-width: 400px;
  }

  .toast {
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    color: white;
    font-weight: 500;
  }

  .toast-success {
    background: #10b981;
  }

  .toast-error {
    background: #ef4444;
  }

  .toast-info {
    background: #3b82f6;
  }

  @media (max-width: 768px) {
    .toast-container {
      left: var(--spacing-md);
      right: var(--spacing-md);
      max-width: none;
    }
  }
</style>
