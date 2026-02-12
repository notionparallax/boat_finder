import { logger } from '$lib/utils/logger';
import { writable } from 'svelte/store';

/**
 * Generic cache factory with TTL (time-to-live)
 * Data persists across page navigations but clears on browser refresh
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Create a cache instance
 * @param {string} name - Cache name for logging
 * @param {number} ttl - Time to live in milliseconds
 * @returns {object} Cache instance with get/set/invalidate methods
 */
function createCache(name, ttl = DEFAULT_TTL) {
    const store = writable({ data: null, timestamp: null });

    function isFresh(timestamp) {
        if (!timestamp) return false;
        return Date.now() - timestamp < ttl;
    }

    return {
        get() {
            /** @type {{ data: any, timestamp: number | null }} */
            let cached;
            store.subscribe(value => cached = value)();

            if (cached && isFresh(cached.timestamp)) {
                logger.log(`Using cached ${name} data`);
                return cached.data;
            }

            logger.log(`${name} cache expired or empty`);
            return null;
        },

        set(data) {
            store.set({
                data,
                timestamp: Date.now()
            });
            logger.log(`${name} data cached`);
        },

        invalidate() {
            store.set({ data: null, timestamp: null });
            logger.log(`${name} cache invalidated`);
        }
    };
}

// Create cache instances
const calendarCache = createCache('Calendar');
const sitesCache = createCache('Sites');

/**
 * Get cached calendar data if fresh
 */
export function getCachedCalendar() {
    return calendarCache.get();
}

/**
 * Set calendar cache
 */
export function setCachedCalendar(data) {
    calendarCache.set(data);
}

/**
 * Get cached sites data if fresh
 */
export function getCachedSites() {
    return sitesCache.get();
}

/**
 * Set sites cache
 */
export function setCachedSites(data) {
    sitesCache.set(data);
}

/**
 * Invalidate calendar cache
 */
export function invalidateCalendarCache() {
    calendarCache.invalidate();
}

/**
 * Invalidate sites cache
 */
export function invalidateSitesCache() {
    sitesCache.invalidate();
}

/**
 * Invalidate all caches
 */
export function invalidateAllCaches() {
    calendarCache.invalidate();
    sitesCache.invalidate();
}
