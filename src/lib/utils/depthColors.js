/**
 * Get depth color based on max depth certification
 * Uses 3-stop gradient: shallow cyan → mid teal → deep navy
 * @param {number} depth - Depth in meters
 * @returns {string} CSS color (rgba format)
 */
export function getDepthColor(depth) {
    // Clamp between 10 and 100 meters
    const min_depth = 10;
    const max_depth = 100;

    const clampedDepth = Math.max(min_depth, Math.min(max_depth, depth));

    // Define gradient stops
    const stops = [
        { depth: 30, color: { r: 190, g: 240, b: 255 } },     // rgba(190, 240, 255, 1) - Shallow cyan
        { depth: 50, color: { r: 20, g: 145, b: 120 } },    // rgba(20, 145, 120, 1) - Mid teal
        { depth: max_depth, color: { r: 0, g: 20, b: 80 } }       // rgba(0, 20, 80, 1) - Deep navy
    ];

    // Find which gradient segment we're in
    let lowerStop, upperStop;
    for (let i = 0; i < stops.length - 1; i++) {
        if (clampedDepth >= stops[i].depth && clampedDepth <= stops[i + 1].depth) {
            lowerStop = stops[i];
            upperStop = stops[i + 1];
            break;
        }
    }

    // If somehow not found, use defaults
    if (!lowerStop || !upperStop) {
        return `rgba(${stops[0].color.r}, ${stops[0].color.g}, ${stops[0].color.b}, 1)`;
    }

    // Interpolate between the two stops
    const range = upperStop.depth - lowerStop.depth;
    const position = (clampedDepth - lowerStop.depth) / range;

    const r = Math.round(lowerStop.color.r + (upperStop.color.r - lowerStop.color.r) * position);
    const g = Math.round(lowerStop.color.g + (upperStop.color.g - lowerStop.color.g) * position);
    const b = Math.round(lowerStop.color.b + (upperStop.color.b - lowerStop.color.b) * position);

    return `rgba(${r}, ${g}, ${b}, 1)`;
}

/**
 * Determine if a depth color is light and needs dark text for contrast
 * @param {number} depth - Depth in meters
 * @returns {boolean} True if text should be dark
 */
export function isLightDepthColor(depth) {
    // Light backgrounds (< 40m) need dark text
    // This ensures WCAG AA contrast ratio of 4.5:1
    return depth < 40;
}

/**
 * Sort divers by depth (shallowest first)
 * @param {Array} divers - Array of diver objects with maxDepth property
 * @returns {Array} Sorted array
 */
export function sortDiversByDepth(divers) {
    return [...divers].sort((a, b) => a.maxDepth - b.maxDepth);
}
