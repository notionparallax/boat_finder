<script>
  import { Phone } from "lucide-svelte";
  import DiverPill from "./DiverPill.svelte";

  let {
    day,
    mobile = false,
    dayData,
    isMyDay,
    isPast,
    isOperator,
    ariaLabel,
    onDayClick,
    onContactClick,
  } = $props();

  let sortedDivers = $derived(
    dayData.divers.toSorted((a, b) => (a.maxDepth || 0) - (b.maxDepth || 0))
  );
</script>

{#if mobile}
  <div
    class="day-cell mobile-day"
    class:my-day={isMyDay}
    class:past={isPast}
    onclick={() => !isPast && onDayClick(day)}
    onkeydown={(e) =>
      !isPast &&
      (e.key === "Enter" || e.key === " ") &&
      onDayClick(day)}
    role="button"
    tabindex={isPast ? -1 : 0}
    aria-disabled={isPast}
    aria-pressed={isPast ? undefined : isMyDay}
    aria-label={ariaLabel}
  >
    <div class="mobile-day-content">
      <div class="mobile-day-header">
        <span class="day-name"
          >{day.toLocaleDateString("en-AU", { weekday: "short" })}</span
        >
        <span class="day-number">{day.getDate()}</span>
        {#if dayData.count > 0}
          <span class="day-count">({dayData.count})</span>
          {#each sortedDivers as diver}
            <DiverPill {diver} />
          {/each}
        {/if}
      </div>
    </div>
    {#if isOperator && dayData.count > 0}
      <button
        class="operator-contact-btn mobile"
        onclick={(e) => onContactClick(day, e)}
        title="Contact divers"
      >
        <Phone size={20} />
      </button>
    {/if}
  </div>
{:else}
  <div
    class="day-cell"
    class:my-day={isMyDay}
    class:past={isPast}
    onclick={() => !isPast && onDayClick(day)}
    onkeydown={(e) =>
      !isPast &&
      (e.key === "Enter" || e.key === " ") &&
      onDayClick(day)}
    role="button"
    tabindex={isPast ? -1 : 0}
    aria-disabled={isPast}
    aria-pressed={isPast ? undefined : isMyDay}
    aria-label={ariaLabel}
  >
    <div class="day-header">
      <span class="day-number">{day.getDate()}</span>
      {#if dayData.count > 0}
        <span class="day-count">({dayData.count})</span>
        {#if isOperator}
          <button
            class="operator-contact-btn"
            onclick={(e) => onContactClick(day, e)}
            title="Contact divers"
          >
            <Phone size={14} />
          </button>
        {/if}
        {#each sortedDivers as diver}
          <DiverPill {diver} />
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .day-cell {
    height: 100%;
    min-height: 120px;
    max-height: 140px;
    padding: var(--spacing-sm);
    border: var(--border-standard);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    position: relative;
    overflow: auto;
  }

  .day-cell:not(.past):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .day-cell.my-day {
    border: var(--border-strong);
    border-color: var(--bg-gradient-start);
    background: white;
  }

  .day-cell.past {
    background: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }

  .day-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--spacing-2xs);
    width: 100%;
  }

  .day-number {
    font-weight: 600;
    font-size: 1.5rem;
  }

  .day-count {
    font-size: 1rem;
    color: var(--bg-gradient-start);
    font-weight: 600;
  }

  .day-cell.mobile-day {
    min-height: auto;
    max-height: none;
    padding: 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    overflow: visible;
  }

  .mobile-day-content {
    flex: 1;
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
  }

  .mobile-day-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--spacing-2xs);
    width: 100%;
  }

  .day-name {
    font-weight: 600;
    font-size: 1rem;
    min-width: 50px;
  }

  .operator-contact-btn {
    background: var(--safety-orange);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
    margin-left: 4px;
    vertical-align: baseline;
    transform: translateY(2px);
  }

  .operator-contact-btn:hover {
    opacity: 0.8;
  }

  .operator-contact-btn.mobile {
    padding: var(--spacing-md) var(--spacing-lg);
    min-width: 60px;
    height: 100%;
    border-radius: 0; /* the border radius is dictated by the parent container because it crops it.  */
    align-self: stretch;
    transform: none;
  }

  /* Keep in sync with MOBILE_BREAKPOINT in src/lib/stores/viewport.js */
  @media (max-width: 768px) {
    .day-cell {
      padding: var(--spacing-xs);
    }

    .day-number {
      font-size: 0.9rem;
    }
  }
</style>
