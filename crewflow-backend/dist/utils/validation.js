"use strict";
/**
 * Utility functions for input validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndParseDate = validateAndParseDate;
/**
 * Validates and parses a date string, returning a proper Date object or undefined
 * @param dateString - The date string to validate
 * @returns Valid Date object or undefined if invalid/empty
 * @throws Error if date string is provided but invalid
 */
function validateAndParseDate(dateString) {
    if (!dateString || dateString.trim() === '') {
        return undefined;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateString}`);
    }
    return date;
}
//# sourceMappingURL=validation.js.map