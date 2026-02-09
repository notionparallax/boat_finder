/**
 * Format date to YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateISO(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Format date for display in Sydney timezone
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateDisplay(date) {
    return date.toLocaleDateString('en-AU', {
        timeZone: 'Australia/Sydney',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Get start and end dates for calendar view (3 months ahead)
 * @returns {{startDate: string, endDate: string}}
 */
export function getCalendarDateRange() {
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    return {
        startDate: formatDateISO(today),
        endDate: formatDateISO(threeMonthsFromNow)
    };
}

/**
 * Get month calendar grid (weeks with days)
 * @param {number} year 
 * @param {number} month 
 * @returns {Array<Array<Date|null>>}
 */
export function getMonthGrid(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const weeks = [];
    let currentWeek = new Array(7).fill(null);

    // Fill in the first week
    for (let i = startDayOfWeek; i < 7; i++) {
        const day = i - startDayOfWeek + 1;
        currentWeek[i] = new Date(year, month, day);
    }
    weeks.push(currentWeek);

    // Fill remaining weeks
    let currentDay = 8 - startDayOfWeek;
    while (currentDay <= lastDay.getDate()) {
        currentWeek = [];
        for (let i = 0; i < 7; i++) {
            if (currentDay <= lastDay.getDate()) {
                currentWeek.push(new Date(year, month, currentDay));
                currentDay++;
            } else {
                currentWeek.push(null);
            }
        }
        weeks.push(currentWeek);
    }

    return weeks;
}

/**
 * Check if two dates are the same day
 * @param {Date} date1 
 * @param {Date} date2 
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
    return formatDateISO(date1) === formatDateISO(date2);
}
