<script>
  import { availabilityApi } from "$lib/api/client.js";
  import { user } from "$lib/stores/auth.js";
  import {
    formatDateISO,
    getCalendarDateRange,
    getMonthGrid,
  } from "$lib/utils/dateHelpers.js";
  import { onMount } from "svelte";
  import DayDetailModal from "./DayDetailModal.svelte";
  import DiverPill from "./DiverPill.svelte";

  let currentDate = $state(new Date());
  let monthGrid = $state([]);
  let availabilityData = $state({});
  let myDates = $state(new Set());
  let selectedDate = $state(null);
  let showModal = $state(false);
  let isOperator = $state(false);

  $effect(() => {
    isOperator = $user?.isOperator || false;
  });

  $effect(() => {
    monthGrid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());
  });

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    const { startDate, endDate } = getCalendarDateRange();
    const [calendar, dates] = await Promise.all([
      availabilityApi.getCalendar(startDate, endDate),
      availabilityApi.getMyDates(),
    ]);

    // Convert to map
    const dataMap = {};
    calendar.forEach((day) => {
      dataMap[day.date] = day;
    });
    availabilityData = dataMap;
    myDates = new Set(dates);
  }

  async function handleDayClick(date) {
    if (!date) return;

    const dateStr = formatDateISO(date);

    if (isOperator) {
      // Open details modal
      selectedDate = dateStr;
      showModal = true;
    } else {
      // Toggle availability
      await availabilityApi.toggleAvailability(dateStr);
      if (myDates.has(dateStr)) {
        myDates.delete(dateStr);
      } else {
        myDates.add(dateStr);
      }
      myDates = myDates; // Trigger reactivity
      await loadData();
    }
  }

  function previousMonth() {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1
    );
  }

  function nextMonth() {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1
    );
  }

  function getMonthName() {
    return currentDate.toLocaleDateString("en-AU", {
      month: "long",
      year: "numeric",
      timeZone: "Australia/Sydney",
    });
  }
</script>

<div class="calendar-container">
  <div class="calendar-header">
    <button onclick={previousMonth} class="nav-button">←</button>
    <h2>{getMonthName()}</h2>
    <button onclick={nextMonth} class="nav-button">→</button>
  </div>

  <div class="calendar">
    <div class="weekday-headers">
      {#each ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as day}
        <div class="weekday">{day}</div>
      {/each}
    </div>

    <div class="days-grid">
      {#each monthGrid as week}
        {#each week as day}
          {#if day}
            {@const dateStr = formatDateISO(day)}
            {@const dayData = availabilityData[dateStr] || {
              divers: [],
              count: 0,
            }}
            {@const isMyDay = myDates.has(dateStr)}
            {@const isPast = day < new Date()}

            <button
              class="day-cell"
              class:my-day={isMyDay}
              class:past={isPast}
              onclick={() => handleDayClick(day)}
              disabled={isPast}
            >
              <div class="day-number">{day.getDate()}</div>
              {#if dayData.count > 0}
                <div class="diver-count">
                  {dayData.count} diver{dayData.count > 1 ? "s" : ""}
                </div>
                <div class="divers-pills">
                  {#each dayData.divers.slice(0, 5) as diver}
                    <DiverPill {diver} />
                  {/each}
                  {#if dayData.divers.length > 5}
                    <span class="more-divers">+{dayData.divers.length - 5}</span
                    >
                  {/if}
                </div>
              {/if}
            </button>
          {:else}
            <div class="day-cell empty"></div>
          {/if}
        {/each}
      {/each}
    </div>
  </div>
</div>

{#if showModal && selectedDate}
  <DayDetailModal
    date={selectedDate}
    onClose={() => {
      showModal = false;
      selectedDate = null;
    }}
  />
{/if}

<style>
  .calendar-container {
    background: var(--calendar-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    color: var(--text-on-calendar);
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-lg);
  }

  .calendar-header h2 {
    font-size: 1.5rem;
    color: var(--text-on-calendar);
  }

  .nav-button {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-gradient-start);
    color: white;
    border-radius: var(--radius-md);
    font-size: 1.2rem;
    transition: opacity 0.2s;
  }

  .nav-button:hover {
    opacity: 0.8;
  }

  .weekday-headers {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }

  .weekday {
    text-align: center;
    font-weight: 600;
    padding: var(--spacing-sm);
    color: var(--text-on-calendar);
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--spacing-xs);
  }

  .day-cell {
    aspect-ratio: 1;
    padding: var(--spacing-sm);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-sm);
    background: white;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    position: relative;
  }

  .day-cell:not(.empty):not(.past):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .day-cell.my-day {
    border: 2px solid var(--bg-gradient-start);
    background: rgba(74, 155, 155, 0.1);
  }

  .day-cell.past {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .day-cell.empty {
    background: transparent;
    border: none;
  }

  .day-number {
    font-weight: 600;
    font-size: 1.1rem;
    margin-bottom: var(--spacing-xs);
  }

  .diver-count {
    font-size: 0.75rem;
    color: var(--bg-gradient-start);
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
  }

  .divers-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    font-size: 0.7rem;
  }

  .more-divers {
    font-size: 0.7rem;
    color: var(--text-on-calendar);
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .calendar-container {
      padding: var(--spacing-md);
    }

    .day-cell {
      padding: var(--spacing-xs);
    }

    .day-number {
      font-size: 0.9rem;
    }

    .diver-count {
      font-size: 0.65rem;
    }
  }
</style>
