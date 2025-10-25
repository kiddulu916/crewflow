/**
 * Utility functions for input validation
 */

/**
 * Validates and parses a date string, returning a proper Date object or undefined
 * @param dateString - The date string to validate
 * @returns Valid Date object or undefined if invalid/empty
 * @throws Error if date string is provided but invalid
 */
export function validateAndParseDate(dateString: string | undefined): Date | undefined {
  if (!dateString || dateString.trim() === '') {
    return undefined;
  }

  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  return date;
}
