/**
 * Get depth color based on max depth certification
 * @param {number} depth - Depth in meters
 * @returns {string} CSS color hex code
 */
export function getDepthColor(depth) {
    const colors = {
        30: '#B3D9FF',
        35: '#99CCFF',
        40: '#80BFFF',
        45: '#66B2FF',
        50: '#4DA6FF',
        55: '#3399FF',
        60: '#1A8CFF',
        65: '#007FFF',
        70: '#0073E6',
        75: '#0066CC',
        80: '#0059B3',
        85: '#004D99',
        90: '#004080',
        95: '#003366',
        100: '#00264D'
    };

    // Round to nearest 5
    const roundedDepth = Math.round(depth / 5) * 5;

    // Clamp between 30 and 100
    const clampedDepth = Math.max(30, Math.min(100, roundedDepth));

    return colors[clampedDepth] || colors[50];
}

/**
 * Sort divers by depth (shallowest first)
 * @param {Array} divers - Array of diver objects with maxDepth property
 * @returns {Array} Sorted array
 */
export function sortDiversByDepth(divers) {
    return [...divers].sort((a, b) => a.maxDepth - b.maxDepth);
}
