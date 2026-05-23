/**
 * Normalizes item names for better search matching in the Image Registry.
 * Rules: lowercase, trim, remove symbols, remove extra whitespace.
 */
function normalizeItemName(name) {
    if (!name) return "";

    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/gi, '') // Remove symbols
        .replace(/\s+/g, ' ');    // Collapse multiple spaces
}

module.exports = { normalizeItemName };
