<script>
  import { availabilityApi } from "$lib/api/client.js";
  import { user } from "$lib/stores/auth.js";
  import {
    getCachedCalendar,
    invalidateCalendarCache,
    setCachedCalendar,
  } from "$lib/stores/dataCache.js";
  import { viewport } from "$lib/stores/viewport.js";
  import { toast } from "$lib/stores/toast";
  import {
    formatDateISO,
    getCalendarDateRange,
    getMonthGrid,
    getWeekStart,
    getWeekDays,
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
  let currentWeekStart = $state(new Date());

  // Use viewport store for mobile detection
  $effect(() => {
    if ($viewport.isMobile) {
      const today = new Date();
      currentWeekStart = getWeekStart(today);
    }
  });

  $effect(() => {
    isOperator = $user?.isOperator || false;
  });

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    // Try to use cached data first
    const cached = getCachedCalendar();
    if (cached) {
      availabilityData = cached.availabilityData;
      myDates = new Set(cached.myDates);
      return;
    }

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

    // Cache the data
    setCachedCalendar({ availabilityData: dataMap, myDates: dates || [] });
  }

  async function handleDayClick(date) {
    if (!date) return;

    const dateStr = formatDateISO(date);

    // Optimistic update: Update UI immediately
    const wasMyDay = myDates.has(dateStr);

    if (wasMyDay) {
      myDates.delete(dateStr);
      // Remove user's pill from availabilityData
      if (availabilityData[dateStr]) {
        availabilityData[dateStr].divers = availabilityData[
          dateStr
        ].divers.filter((d) => d.userId !== $user?.userId);
        availabilityData[dateStr].count =
          availabilityData[dateStr].divers.length;
      }
    } else {
      myDates.add(dateStr);
      // Add user's pill to availabilityData
      if (!availabilityData[dateStr]) {
        availabilityData[dateStr] = { date: dateStr, divers: [], count: 0 };
      }
      availabilityData[dateStr].divers = [
        ...availabilityData[dateStr].divers,
        {
          userId: $user?.userId,
          firstName: $user?.firstName,
          lastName: $user?.lastName,
          displayName:
            $user?.displayName || `${$user?.firstName} ${$user?.lastName}`,
          maxDepth: $user?.maxDepth,
          photoURL: $user?.photoURL,
        },
      ];
      availabilityData[dateStr].count = availabilityData[dateStr].divers.length;
    }
    myDates = myDates; // Trigger reactivity
    availabilityData = availabilityData; // Trigger reactivity

    // Update cache immediately with optimistic data
    setCachedCalendar({
      availabilityData,
      myDates: Array.from(myDates),
    });

    // Then sync with backend
    try {
      // API returns data directly (not wrapped in {success, data})
      const updatedData = await availabilityApi.toggleAvailability(dateStr);

      // Silently update from backend without reloading full calendar
      // This prevents scroll bounce while keeping data in sync
      if (updatedData) {
        // Only update availabilityData if backend returned the divers list
        // Otherwise, trust the optimistic update we already made
        if (updatedData.divers !== undefined) {
          availabilityData[dateStr] = {
            date: dateStr,
            divers: updatedData.divers || [],
            count: updatedData.divers?.length || 0,
          };

          // CRITICAL: Sync myDates with actual backend state
          // Check if user is in the updated divers list
          const userIsInDivers = updatedData.divers?.some(
            (d) => d.userId === $user?.userId
          );

          if (userIsInDivers) {
            myDates.add(dateStr);
          } else {
            myDates.delete(dateStr);
          }
        }

        myDates = myDates; // Trigger reactivity
        availabilityData = availabilityData; // Trigger reactivity

        // Update cache with synchronized state
        setCachedCalendar({
          availabilityData,
          myDates: Array.from(myDates),
        });

        // Invalidate cache so next page load gets fresh data
        invalidateCalendarCache();
      }
    } catch (error) {
      logger.error("Failed to toggle availability:", error);

      // Rollback optimistic update on failure
      if (wasMyDay) {
        myDates.add(dateStr);
        // Re-add user's pill
        if (availabilityData[dateStr]) {
          availabilityData[dateStr].divers = [
            ...availabilityData[dateStr].divers,
            {
              userId: $user?.userId,
              firstName: $user?.firstName,
              lastName: $user?.lastName,
              maxDepth: $user?.maxDepth,
              photoURL: $user?.photoURL,
            },
          ];
          availabilityData[dateStr].count =
            availabilityData[dateStr].divers.length;
        }
      } else {
        myDates.delete(dateStr);
        // Remove user's pill
        if (availabilityData[dateStr]) {
          availabilityData[dateStr].divers = availabilityData[
            dateStr
          ].divers.filter((d) => d.userId !== $user?.userId);
          availabilityData[dateStr].count =
            availabilityData[dateStr].divers.length;
        }
      }
      myDates = myDates; // Trigger reactivity
      availabilityData = availabilityData; // Trigger reactivity

      toast.error(
        `Failed to mark availability: ${error.message || "Unknown error"}. Please try again.`
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

    if ($viewport.isMobile) {
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

    if ($viewport.isMobile) {
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

    if ($viewport.isMobile) {
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

    if ($viewport.isMobile) {
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
    if ($viewport.isMobile) {
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
      aria-label={$viewport.isMobile ? "Previous week" : "Previous month"}
      disabled={!canGoPrevious()}>←</button
    >
    <h2>{getMonthName()}</h2>
    <button onclick={nextMonth} class="nav-button" aria-label={$viewport.isMobile ? "Next week" : "Next month"} disabled={!canGoNext()}
      >→</button
    >
  </div>

  <div class="calendar">
    {#if !$viewport.isMobile}
      <div class="weekday-headers">
        {#each ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as day}
          <div class="weekday">{day}</div>
        {/each}
      </div>
    {/if}

    <div class="days-grid" class:mobile-week={$viewport.isMobile}>
      {#if $viewport.isMobile}
        {#each getWeekDays(currentWeekStart) as day}
          {@const dateStr = formatDateISO(day)}
          {@const dayData = availabilityData[dateStr] || {
            divers: [],
            count: 0,
          }}
          {@const isMyDay = myDates.has(dateStr)}
          {@const isPast = day < new Date()}

          <div
            class="day-cell mobile-day"
            class:my-day={isMyDay}
            class:past={isPast}
            onclick={() => !isPast && handleDayClick(day)}
            onkeydown={(e) =>
              !isPast &&
              (e.key === "Enter" || e.key === " ") &&
              handleDayClick(day)}
            role="button"
            tabindex={isPast ? -1 : 0}
            aria-disabled={isPast}
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
                  {#each dayData.divers.toSorted((a, b) => (a.maxDepth || 0) - (b.maxDepth || 0)) as diver}
                    <DiverPill {diver} />
                  {/each}
                </div>
              {/if}
            </div>
          </div>
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

              <div
                class="day-cell"
                class:my-day={isMyDay}
                class:past={isPast}
                onclick={() => !isPast && handleDayClick(day)}
                onkeydown={(e) =>
                  !isPast &&
                  (e.key === "Enter" || e.key === " ") &&
                  handleDayClick(day)}
                role="button"
                tabindex={isPast ? -1 : 0}
                aria-disabled={isPast}
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
                    {#each dayData.divers.toSorted((a, b) => (a.maxDepth || 0) - (b.maxDepth || 0)) as diver}
                      <DiverPill {diver} />
                    {/each}
                  {/if}
                </div>
              </div>
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
    overflow: hidden; /* Prevent calendar from overflowing container */
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: var(--spacing-sm);
    flex: 1;
    overflow: auto; /* Allow grid to scroll if needed */
  }

  .day-cell {
    height: 100%;
    min-height: 120px;
    max-height: 140px;
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
    overflow: auto;
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

    .weekday-headers {
      display: none;
    }
  }
</style>
