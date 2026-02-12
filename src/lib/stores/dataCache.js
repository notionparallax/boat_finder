import { logger } from '$lib/utils/logger';
import { writable } from 'svelte/store';

/**
 * Simple in-memory cache with TTL (time-to-live)
 * Data persists across page navigations but clears on browser refresh
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache stores
export const calendarCache = writable({ data: null, timestamp: null });
export const sitesCache = writable({ data: null, timestamp: null });

/**
 * Check if cached data is still fresh
 */
function isFresh(timestamp) {
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Get cached calendar data if fresh
 */
export function getCachedCalendar() {
    let cached;
    calendarCache.subscribe(value => cached = value)();

    if (isFresh(cached.timestamp)) {
        logger.log('Using cached calendar data');
        return cached.data;
    }

    logger.log('Calendar cache expired or empty');
    return null;
}

/**
 * Set calendar cache
 */
export function setCachedCalendar(data) {
    calendarCache.set({
        data,
        timestamp: Date.now()
    });
    logger.log('Calendar data cached');
}

/**
 * Get cached sites data if fresh
 */
export function getCachedSites() {
    let cached;
    sitesCache.subscribe(value => cached = value)();

    if (isFresh(cached.timestamp)) {
        logger.log('Using cached sites data');
        return cached.data;
    }

    logger.log('Sites cache expired or empty');
    return null;
}

/**
 * Set sites cache
 */
export function setCachedSites(data) {
    sitesCache.set({
        data,
        timestamp: Date.now()
    });
    logger.log('Sites data cached');
}

/**
 * Invalidate all caches (e.g., after user makes changes)
 */
export function invalidateCalendarCache() {
    calendarCache.set({ data: null, timestamp: null });
    logger.log('Calendar cache invalidated');
}

export function invalidateSitesCache() {
    sitesCache.set({ data: null, timestamp: null });
    logger.log('Sites cache invalidated');
}

export function invalidateAllCaches() {
    invalidateCalendarCache();
    invalidateSitesCache();
    logger.log('All caches invalidated');
}
