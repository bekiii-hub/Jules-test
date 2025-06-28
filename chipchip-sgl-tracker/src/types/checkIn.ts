export interface CheckInRecord {
  id: string; // Unique identifier for the check-in
  salespersonName: string;
  date: string; // YYYY-MM-DD format for the day of check-in
  timestamp: string; // ISO string for exact date and time
}
