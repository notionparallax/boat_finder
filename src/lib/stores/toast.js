import { writable } from 'svelte/store';

export const toasts = writable([]);

let nextId = 0;

/**
 * Show a toast notification (internal)
 * @param {string} message - The message to display
 * @param {('success'|'error'|'info')} type - The type of toast
 * @param {number} duration - Duration in ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const id = nextId++;
    toasts.update(t => [...t, { id, message, type }]);

    setTimeout(() => {
        toasts.update(t => t.filter(toast => toast.id !== id));
    }, duration);
}

export const toast = {
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    info: (message, duration) => showToast(message, 'info', duration)
};
