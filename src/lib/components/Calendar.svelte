<script>
  import { availabilityApi } from "$lib/api/client.js";
  import { user } from "$lib/stores/auth.js";
  import { toast } from "$lib/stores/toast";
  import {
    formatDateISO,
    getCalendarDateRange,
    getMonthGrid,
  } from "$lib/utils/dateHelpers.js";
  import { logger } from "$lib/utils/logger";
  import { Phone } from "lucide-svelte";
  import { onMount } from "svelte";
  import DayDetailModal from "./DayDetailModal.svelte";
  import DiverPill from "./DiverPill.svelte";

  let currentDate = $state(new Date());
  let monthGrid = $derived(
    getMonthGrid(currentDate.getFullYear(), currentDate.getMonth())
  );
  let availabilityData = $state({});
  let myDates = $state(new Set());
  let selectedDate = $state(null);
  let showModal = $state(false);
  let isOperator = $state(false);
  let isMobile = $state(false);
  let currentWeekStart = $state(new Date());

  onMount(() => {
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  });

  function checkMobile() {
    isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // Set to current week on mobile
      const today = new Date();
      currentWeekStart = getWeekStart(today);
    }
  }

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    // Start on Monday: if Sunday (0), go back 6 days; otherwise go back (day - 1) days
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    return new Date(d.setDate(diff));
  }

  function getWeekDays(startDate) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }

  $effect(() => {
    isOperator = $user?.isOperator || false;
  });

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    // Always fetch 3 months from today
    const { startDate, endDate } = getCalendarDateRange();
    const [calendar, dates] = await Promise.all([
      availabilityApi.getCalendar(startDate, endDate),
      availabilityApi.getMyDates(startDate, endDate),
    ]);

    // Transform calendar object to expected format
    const dataMap = {};
    for (const [date, divers] of Object.entries(calendar || {})) {
      dataMap[date] = {
        date: date,
        divers: divers,
        count: divers.length,
      };
    }
    availabilityData = dataMap;
    myDates = new Set(dates || []);
  }

  async function handleDayClick(date) {
    if (!date) return;

    const dateStr = formatDateISO(date);

    // Toggle availability for all users (operators and regular)
    try {
      const response = await availabilityApi.toggleAvailability(dateStr);
      logger.log("Toggle availability response:", response);

      if (myDates.has(dateStr)) {
        myDates.delete(dateStr);
      } else {
        myDates.add(dateStr);
      }
      myDates = myDates; // Trigger reactivity
      await loadData();
    } catch (error) {
      logger.error("Failed to toggle availability:", error);
      toast.error(
        `Failed to mark availability: ${error.message || "Unknown error"}. Please check the console for details.`
      );
    }
  }

  function handleOperatorContactClick(date, event) {
    event.stopPropagation();
    selectedDate = formatDateISO(date);
    showModal = true;
  }

  function previousMonth() {
    const today = new Date();

    if (isMobile) {
      // Previous week
      const prevWeek = new Date(currentWeekStart);
      prevWeek.setDate(currentWeekStart.getDate() - 7);

      // Only allow if not before today
      if (prevWeek >= getWeekStart(today)) {
        currentWeekStart = prevWeek;
      }
    } else {
      const prevMonthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1
      );

      // Only allow if previous month is not before current month
      if (
        prevMonthDate.getMonth() >= today.getMonth() ||
        prevMonthDate.getFullYear() > today.getFullYear()
      ) {
        currentDate = prevMonthDate;
        loadData();
      }
    }
  }

  function canGoPrevious() {
    const today = new Date();

    if (isMobile) {
      const prevWeek = new Date(currentWeekStart);
      prevWeek.setDate(currentWeekStart.getDate() - 7);
      return prevWeek >= getWeekStart(today);
    }

    const prevMonthDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1
    );

    return (
      prevMonthDate.getMonth() >= today.getMonth() &&
      prevMonthDate.getFullYear() >= today.getFullYear()
    );
  }

  function nextMonth() {
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    if (isMobile) {
      // Next week
      const nextWeek = new Date(currentWeekStart);
      nextWeek.setDate(currentWeekStart.getDate() + 7);

      // Only allow if within 3 months
      if (nextWeek <= threeMonthsFromNow) {
        currentWeekStart = nextWeek;
      }
    } else {
      const nextMonthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );

      // Only allow if next month is within 3 months from today
      if (nextMonthDate <= threeMonthsFromNow) {
        currentDate = nextMonthDate;
        loadData();
      }
    }
  }

  function canGoNext() {
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    if (isMobile) {
      const nextWeek = new Date(currentWeekStart);
      nextWeek.setDate(currentWeekStart.getDate() + 7);
      return nextWeek <= threeMonthsFromNow;
    }

    const nextMonthDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1
    );

    return nextMonthDate <= threeMonthsFromNow;
  }

  function getMonthName() {
    if (isMobile) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

      return `${currentWeekStart.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        timeZone: "Australia/Sydney",
      })} - ${weekEnd.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        timeZone: "Australia/Sydney",
      })}`;
    }

    return currentDate.toLocaleDateString("en-AU", {
      month: "long",
      year: "numeric",
      timeZone: "Australia/Sydney",
    });
  }
</script>

<div class="calendar-container">
  <div class="calendar-header">
    <button
      onclick={previousMonth}
      class="nav-button"
      disabled={!canGoPrevious()}>←</button
    >
    <h2>{getMonthName()}</h2>
    <button onclick={nextMonth} class="nav-button" disabled={!canGoNext()}
      >→</button
    >
  </div>

  <div class="calendar">
    {#if !isMobile}
      <div class="weekday-headers">
        {#each ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as day}
          <div class="weekday">{day}</div>
        {/each}
      </div>
    {/if}

    <div class="days-grid" class:mobile-week={isMobile}>
      {#if isMobile}
        {#each getWeekDays(currentWeekStart) as day}
          {@const dateStr = formatDateISO(day)}
          {@const dayData = availabilityData[dateStr] || {
            divers: [],
            count: 0,
          }}
          {@const isMyDay = myDates.has(dateStr)}
          {@const isPast = day < new Date()}

          <button
            class="day-cell mobile-day"
            class:my-day={isMyDay}
            class:past={isPast}
            onclick={() => handleDayClick(day)}
            disabled={isPast}
          >
            <div class="mobile-day-header">
              <div class="day-info">
                <span class="day-name"
                  >{day.toLocaleDateString("en-AU", { weekday: "short" })}</span
                >
                <span class="day-number">{day.getDate()}</span>
                {#if dayData.count > 0}
                  <span class="day-count">({dayData.count})</span>
                  {#if isOperator}
                    <button
                      class="operator-contact-btn mobile"
                      onclick={(e) => handleOperatorContactClick(day, e)}
                      title="Contact divers"
                    >
                      <Phone size={16} />
                    </button>
                  {/if}
                {/if}
              </div>
              {#if dayData.count > 0}
                <div class="divers-list">
                  {#each dayData.divers.slice(0, 5) as diver}
                    <DiverPill {diver} />
                  {/each}
                  {#if dayData.divers.length > 5}
                    <span class="more-divers">+{dayData.divers.length - 5}</span
                    >
                  {/if}
                </div>
              {/if}
            </div>
          </button>
        {/each}
      {:else}
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
                <div class="day-header">
                  <span class="day-number">{day.getDate()}</span>
                  {#if dayData.count > 0}
                    <span class="day-count">({dayData.count})</span>
                    {#if isOperator}
                      <button
                        class="operator-contact-btn"
                        onclick={(e) => handleOperatorContactClick(day, e)}
                        title="Contact divers"
                      >
                        <Phone size={14} />
                      </button>
                    {/if}
                    {#each dayData.divers.slice(0, 5) as diver}
                      <DiverPill {diver} />
                    {/each}
                    {#if dayData.divers.length > 5}
                      <span class="more-divers"
                        >+{dayData.divers.length - 5}</span
                      >
                    {/if}
                  {/if}
                </div>
              </button>
            {:else}
              <div class="day-cell empty"></div>
            {/if}
          {/each}
        {/each}
      {/if}
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
    max-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
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

  .nav-button:hover:not(:disabled) {
    opacity: 0.8;
  }

  .nav-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
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

  .calendar {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: var(--spacing-sm);
    flex: 1;
  }

  .day-cell {
    height: 100%;
    min-height: 120px;
    padding: var(--spacing-md);
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

  .day-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px;
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

  .more-divers {
    font-size: 0.7rem;
    color: var(--text-on-calendar);
    opacity: 0.7;
  }

  /* Mobile week view styles */
  .days-grid.mobile-week {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: var(--spacing-sm);
  }

  .day-cell.mobile-day {
    min-height: auto;
    padding: var(--spacing-md);
  }

  .mobile-day-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    width: 100%;
  }

  .day-info {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-sm);
  }

  .day-name {
    font-weight: 600;
    font-size: 1rem;
    min-width: 50px;
  }

  .divers-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .operator-contact-btn {
    background: var(--bg-gradient-start);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 4px 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
    margin-left: 4px;
  }

  .operator-contact-btn:hover {
    opacity: 0.8;
  }

  .operator-contact-btn.mobile {
    padding: 6px 8px;
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

    .weekday-headers {
      display: none;
    }
  }
</style>
