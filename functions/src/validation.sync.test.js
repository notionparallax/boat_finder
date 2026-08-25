import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NAME_REGEX, SITE_NAME_REGEX, normalizeAustralianMobile } from "./validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// These guard against the client's duplicated copies of the same rules (see
// src/routes/profile/+page.svelte and src/routes/sites/+page.svelte)
// silently drifting from this file, the server-side source of truth. A
// single shared import isn't practical here - Rollup's production build
// can't reliably do CJS/ESM interop for a plain local .js file that's also
// require()'d by functions/.

function extractRegexLiteral(source, constName) {
    // Line-based rather than a single regex-matching-a-regex: these are
    // simple one-line `const NAME = /.../;` declarations, and the target
    // regex literals themselves can contain an unescaped `/` inside a
    // character class (e.g. SITE_NAME_REGEX's `.,./+`), which breaks any
    // naive "match up to the next /" extraction pattern.
    const line = source.split("\n").find((l) => l.includes(`const ${constName} = `));
    if (!line) {
        throw new Error(`Could not find "const ${constName} = /.../ " in source`);
    }
    const literalText = line.split(`const ${constName} = `)[1].trim().replace(/;$/, "");
    // eslint-disable-next-line no-new-func
    return new Function(`return ${literalText};`)();
}

describe("client validation copies stay in sync with functions/src/validation.js", () => {
    it("NAME_REGEX matches the copy in profile/+page.svelte", () => {
        const source = fs.readFileSync(
            path.join(__dirname, "../../src/routes/profile/+page.svelte"),
            "utf8"
        );
        const clientRegex = extractRegexLiteral(source, "NAME_REGEX");
        expect(clientRegex.source).toBe(NAME_REGEX.source);
        expect(clientRegex.flags).toBe(NAME_REGEX.flags);
    });

    it("SITE_NAME_REGEX matches the copy in sites/+page.svelte", () => {
        const source = fs.readFileSync(
            path.join(__dirname, "../../src/routes/sites/+page.svelte"),
            "utf8"
        );
        const clientRegex = extractRegexLiteral(source, "SITE_NAME_REGEX");
        expect(clientRegex.source).toBe(SITE_NAME_REGEX.source);
        expect(clientRegex.flags).toBe(SITE_NAME_REGEX.flags);
    });

    it("the phone numbers accepted by profile/+page.svelte match normalizeAustralianMobile", () => {
        const source = fs.readFileSync(
            path.join(__dirname, "../../src/routes/profile/+page.svelte"),
            "utf8"
        );
        // The client validates inline with three regex literals rather than
        // a named export - pull them out the same way and check the same
        // sample numbers are accepted/rejected identically to the server.
        const regexLiterals = [...source.matchAll(/\/\^[^/\n]*\\d\{8\}\$\/[a-z]*/g)].map(
            // eslint-disable-next-line no-new-func
            (m) => new Function(`return ${m[0]};`)()
        );
        expect(regexLiterals.length).toBe(3);

        const samples = [
            "0412345678",
            "+61412345678",
            "61412345678",
            "0412 345 678",
            "(04) 1234-5678",
            "0512345678",
            "041234567",
            "not a phone",
            "",
        ];

        for (const sample of samples) {
            const normalized = sample.trim().replace(/[\s()-]/g, "");
            const clientAccepts = regexLiterals.some((re) => re.test(normalized));
            const serverAccepts = !normalizeAustralianMobile(sample).error;
            expect(clientAccepts).toBe(serverAccepts);
        }
    });
});
