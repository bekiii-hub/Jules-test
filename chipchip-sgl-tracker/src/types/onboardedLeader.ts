export interface OnboardedLeader {
  id: string; // Should match the original lead's ID
  name: string; // Readonly after promotion
  phone: string; // Readonly after promotion
  location: string;
  upgradeDate: string; // ISO string (YYYY-MM-DD)
  ordered: boolean; // Default to false
  salesperson?: string;
  source: string;
  cohort?: string;
  remark?: string;
}
