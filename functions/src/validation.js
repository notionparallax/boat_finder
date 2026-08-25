// Shared validation primitives (regexes + pure normalization) used by both
// the Cloud Functions API and the SvelteKit client, so the client-side and
// server-side rules for what's an acceptable name/phone/site-name can't
// silently drift apart. Written as CommonJS since it's required directly by
// functions/src/*.js; Vite's bundler also handles importing it as-is from
// the client (see src/routes/profile/+page.svelte and
// src/routes/sites/+page.svelte).

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/;
const SITE_NAME_REGEX = /^[A-Za-z0-9À-ÖØ-öø-ÿ'&(),./+\-\s]+$/;

/**
 * Normalize an Australian mobile number to 04XXXXXXXX form.
 * Accepts 04XXXXXXXX, +614XXXXXXXX, or 614XXXXXXXX (with optional spaces,
 * hyphens, or parentheses). Returns { value } on success or { error }.
 */
function normalizeAustralianMobile(input) {
    const raw = String(input ?? "").trim();
    if (!raw) {
        return { error: "phone is required" };
    }

    const normalized = raw.replace(/[\s()-]/g, "");

    if (/^04\d{8}$/.test(normalized)) {
        return { value: normalized };
    }

    if (/^\+614\d{8}$/.test(normalized)) {
        return { value: `0${normalized.slice(3)}` };
    }

    if (/^614\d{8}$/.test(normalized)) {
        return { value: `0${normalized.slice(2)}` };
    }

    return { error: "phone must be a valid Australian mobile number (e.g. 04XXXXXXXX)" };
}

module.exports = { NAME_REGEX, SITE_NAME_REGEX, normalizeAustralianMobile };
