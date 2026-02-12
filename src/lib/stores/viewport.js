import { writable } from 'svelte/store';

/**
 * Viewport store for responsive behavior
 * Provides reactive window dimensions and mobile detection
 */

const MOBILE_BREAKPOINT = 768;

function createViewportStore() {
    const { subscribe, set } = writable({
        width: typeof window !== 'undefined' ? window.innerWidth : 1024,
        height: typeof window !== 'undefined' ? window.innerHeight : 768,
        isMobile: typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
    });

    if (typeof window !== 'undefined') {
        const updateViewport = () => {
            set({
                width: window.innerWidth,
                height: window.innerHeight,
                isMobile: window.innerWidth <= MOBILE_BREAKPOINT
            });
        };

        window.addEventListener('resize', updateViewport);

        // Cleanup handled by component unmount
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                window.removeEventListener('resize', updateViewport);
            });
        }
    }

    return { subscribe };
}

export const viewport = createViewportStore();
