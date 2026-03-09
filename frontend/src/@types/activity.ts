import { User } from "./user";

export type ActivityStatus = "Open" | "In Progress" | "Closed" | "On-Hold" | "Completed";

export interface TargetDateHistory {
  id: string;
  activity_id: string;
  old_date: string | null;
  new_date: string | null;
  remarks: string | null;
  changed_by: User | null;
  changed_at: string;
}

export interface Activity {
  id: string;
  client_name: string;
  entry_date: string;
  action_item: string;
  assigned_to_id: string | null;
  assigned_to?: User | null;
  product_domain: string | null;
  activity_type: string | null;
  target_closure_date: string | null;
  initial_target_closure_date: string | null;
  actual_closure_date: string | null;
  status: ActivityStatus;
  remarks: string | null;
  created_by_id: string | null;
  created_by?: User | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityCreate {
  client_name: string;
  entry_date: string;
  action_item: string;
  assigned_to_id?: string | null;
  product_domain?: string | null;
  activity_type?: string | null;
  target_closure_date?: string | null;
  actual_closure_date?: string | null;
  status: ActivityStatus;
  remarks?: string | null;
}

export interface ActivityUpdate extends Partial<ActivityCreate> {
  target_date_change_remarks?: string | null;
}

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  page: number;
  page_size: number;
}

export const ACTIVITY_STATUSES: ActivityStatus[] = [
  "Open", "In Progress", "Closed", "On-Hold", "Completed"
];

export const ACTIVITY_TYPES: string[] = [
  "Offshore", "Documentation", "Project", "Resource", "Follow Up",
  "Proposal", "R&D", "POC", "Analysis", "Support", "Internal",
  "Effort Estimation", "Knowledge Transfer", "Training", "Development",
  "Testing", "Webinar", "CR", "Audit", "Other",
];

export const PRODUCT_DOMAINS: string[] = [
  "RPA", "Full Stack", "DevOps", "Mendix", "AI", "Mobile", ".Net",
  "Resource Augmentation", "Data Engineering", "Power Platform",
  "Internal", "PMO", "After Market", "Teamcenter", "AI & ML",
  "Python Full Stack", "Data Science", "Automation", "DBA",
  "Performance Testing", "Polarion", "CMS", "Lotus Notes", "Other",
];
