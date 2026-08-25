import { describe, expect, it } from "vitest";
import { NAME_REGEX, SITE_NAME_REGEX, normalizeAustralianMobile } from "./validation.js";

describe("NAME_REGEX", () => {
    it.each(["Jamie", "O'Brien", "Anne-Marie", "José", "Zoë Smith"])(
        "accepts %s",
        (name) => {
            expect(NAME_REGEX.test(name)).toBe(true);
        }
    );

    it.each(["<script>", "Jamie123", "jamie@example.com", "Jamie; DROP TABLE"])(
        "rejects %s",
        (name) => {
            expect(NAME_REGEX.test(name)).toBe(false);
        }
    );
});

describe("SITE_NAME_REGEX", () => {
    it.each(["SS Currajong", "Wreck Bay (North)", "Site One - Reef/Drop-off"])(
        "accepts %s",
        (name) => {
            expect(SITE_NAME_REGEX.test(name)).toBe(true);
        }
    );

    it.each(["<img src=x onerror=alert(1)>", "Site\"; DROP TABLE sites;--"])(
        "rejects %s",
        (name) => {
            expect(SITE_NAME_REGEX.test(name)).toBe(false);
        }
    );
});

describe("normalizeAustralianMobile", () => {
    it.each([
        ["0412345678", "0412345678"],
        ["+61412345678", "0412345678"],
        ["61412345678", "0412345678"],
        ["0412 345 678", "0412345678"],
        ["(04) 1234-5678", "0412345678"],
    ])("normalizes %s to %s", (input, expected) => {
        const result = normalizeAustralianMobile(input);
        expect(result.error).toBeUndefined();
        expect(result.value).toBe(expected);
    });

    it.each([
        [""],
        ["not a phone"],
        ["041234567"], // too short
        ["0512345678"], // not a 04 mobile prefix
        ["+1 415 555 0100"], // non-AU number
    ])("rejects %s", (input) => {
        const result = normalizeAustralianMobile(input);
        expect(result.error).toBeDefined();
        expect(result.value).toBeUndefined();
    });
});
