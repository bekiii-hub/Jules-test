export type LeadStatus =
  | "Not contacted"
  | "Contacted"
  | "Needs follow-up"
  | "Appointment set"
  | "Awaiting decision"
  | "Converted"
  | "Not interested";

export interface Lead {
  id: string; // Unique identifier
  name: string;
  phone: string;
  location: string;
  status: LeadStatus;
  remark?: string; // Optional
  appointment?: string; // Optional, could be ISO date string
  salesperson?: string; // Name or ID of the assigned salesperson
  source: string; // e.g., "From List", "Referral", "Walk-in"
  cohort?: string; // Optional, e.g., "Q3-2024"
  // Internal fields for promotion logic
  isPromoted?: boolean;
}
