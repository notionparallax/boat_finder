import { 
    format, 
    addMonths, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval,
    startOfWeek,
    endOfWeek,
    isSameDay as dateFnsSameDay,
    addDays
} from 'date-fns';

/**
 * Format date to YYYY-MM-DD (ISO format)
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateISO(date) {
    return format(date, 'yyyy-MM-dd');
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
    const threeMonthsFromNow = addMonths(today, 3);

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
    const firstDay = startOfMonth(new Date(year, month));
    const lastDay = endOfMonth(new Date(year, month));
    
    // Get all days from the start of the week containing the first day
    // to the end of the week containing the last day
    const start = startOfWeek(firstDay, { weekStartsOn: 0 }); // Sunday
    const end = endOfWeek(lastDay, { weekStartsOn: 0 });
    
    const allDays = eachDayOfInterval({ start, end });
    
    // Group into weeks
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
        const week = allDays.slice(i, i + 7).map(day => {
            // Return null if the day is not in the current month
            return day.getMonth() === month ? day : null;
        });
        weeks.push(week);
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
    return dateFnsSameDay(date1, date2);
}

/**
 * Get the start of the week (Monday) for a given date
 * @param {Date} date 
 * @returns {Date}
 */
export function getWeekStart(date) {
    return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

/**
 * Get array of 7 days starting from a given date
 * @param {Date} startDate 
 * @returns {Array<Date>}
 */
export function getWeekDays(startDate) {
    return eachDayOfInterval({
        start: startDate,
        end: addDays(startDate, 6)
    });
}
