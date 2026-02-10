/**
 * Logging utility that only logs in development mode
 */
const DEBUG = import.meta.env.DEV;

export const logger = {
    log: (...args) => DEBUG && console.log(...args),
    error: (...args) => console.error(...args), // Always log errors
    warn: (...args) => DEBUG && console.warn(...args)
};
