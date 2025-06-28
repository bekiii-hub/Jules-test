// dateUtils.ts

/**
 * Gets the start (Sunday) and end (Saturday) dates of the week for a given date.
 * @param d - The date for which to find the week. Defaults to today.
 * @returns Object with { weekStart: Date, weekEnd: Date }
 */
export const getWeekRange = (d: Date = new Date()): { weekStart: Date, weekEnd: Date } => {
  d = new Date(d); // Create a new date object to avoid modifying the original
  const day = d.getDay(); // 0 (Sunday) - 6 (Saturday)
  const diffToSunday = d.getDate() - day;
  const diffToSaturday = diffToSunday + 6;

  const weekStart = new Date(d.setDate(diffToSunday));
  weekStart.setHours(0, 0, 0, 0); // Set to start of the day

  const weekEnd = new Date(d.setDate(diffToSaturday)); // Use the same 'd' which is now Sunday
  weekEnd.setHours(23, 59, 59, 999); // Set to end of the day

  return { weekStart, weekEnd };
};

/**
 * Checks if a given date string (YYYY-MM-DD) is within a specific week.
 * @param dateString - The date string to check.
 * @param weekStart - The start date of the week.
 * @param weekEnd - The end date of the week.
 * @returns True if the date is within the week, false otherwise.
 */
export const isDateInWeek = (dateString: string, weekStart: Date, weekEnd: Date): boolean => {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    // Adjust date to be in UTC to avoid timezone issues if dates are stored as YYYY-MM-DD without time
    const checkDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return checkDate >= weekStart && checkDate <= weekEnd;
  } catch (e) {
    console.error("Error parsing date string:", dateString, e);
    return false;
  }
};

/**
 * Formats a date object to YYYY-MM-DD string.
 */
export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generates a list of week strings (e.g., "Week of Oct 28, 2024") for a dropdown.
 * Goes back a certain number of weeks from the current week.
 * @param count - Number of weeks to generate (including current).
 * @returns Array of objects { value: string (YYYY-MM-DD of weekStart), label: string }
 */
export const getRecentWeeks = (count: number = 12): { value: string, label: string }[] => {
  const weeks = [];
  let currentDate = new Date();
  for (let i = 0; i < count; i++) {
    const { weekStart } = getWeekRange(currentDate);
    weeks.push({
      value: formatDateToYYYYMMDD(weekStart),
      label: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    });
    // Move to the previous week
    currentDate.setDate(currentDate.getDate() - 7);
  }
  return weeks;
};
