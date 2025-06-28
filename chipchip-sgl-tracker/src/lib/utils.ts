import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes Ethiopian phone numbers to +2519XXXXXXXX format.
 * Accepted formats: 0946xxxxxx, 946xxxxxx, 251946xxxxxx
 * @param inputPhoneNumber The phone number string to normalize.
 * @returns The normalized phone number string, or the original input if it cannot be normalized.
 */
export const normalizePhone = (inputPhoneNumber: string): string => {
  if (!inputPhoneNumber) return '';

  const digits = inputPhoneNumber.replace(/\D/g, ''); // Remove all non-digit characters

  if (digits.startsWith('2519') && digits.length === 12) {
    // Already in 2519XXXXXXXX format (or close enough, just needs +)
    return `+${digits}`;
  }
  if (digits.startsWith('09') && digits.length === 10) {
    // Format 09XXXXXXXX
    return `+251${digits.substring(1)}`;
  }
  if (digits.startsWith('9') && digits.length === 9) {
    // Format 9XXXXXXXX (missing leading 0)
    return `+251${digits}`;
  }

  // If none of the rules match, return the original input or an empty string,
  // or perhaps throw an error, depending on desired strictness.
  // For now, returning a formatted version if it looks like a 251 number without plus, or original.
  if (digits.startsWith('251') && digits.length > 9) return `+${digits}`; // Handles cases like 25109... if non-digits were present

  // Return original if it's not a recognized pattern that can be easily converted to +2519 format.
  // Or, one might decide to return empty string or throw error for unparseable numbers.
  // For this spec, we try to be a bit lenient but aim for the target.
  // If it's just 9 digits like 46xxxxxx, it's ambiguous without more context.
  // The spec implies we should be able to handle 946xxxxxx -> +251946xxxxxx

  console.warn(`Phone number "${inputPhoneNumber}" could not be reliably normalized to +2519XXXXXXXX format. Original will be used or needs review.`);
  return inputPhoneNumber; // Fallback for numbers that don't match expected patterns
};
