export interface UserCountItem {
  id: string;
  name: string;
  count: number;
}

export interface ResourceCompletionItem {
  id: string;
  name: string;
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  closed: number;
}

export interface OverdueActivityItem {
  id: string;
  client_name: string;
  action_item: string;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  status: string;
  target_closure_date: string;
  days_overdue: number;
}

export interface RecentActivityItem {
  id: string;
  client_name: string;
  action_item: string;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  status: string;
  target_closure_date: string | null;
  created_at: string;
}

export interface TypeCountItem {
  label: string;
  count: number;
}

export interface AdminDashboardStats {
  total: number;
  open: number;
  in_progress: number;
  closed: number;
  completed: number;
  on_hold: number;
  overdue: number;
  top_overdue_by_user: UserCountItem[];
  top_pending_by_user: UserCountItem[];
  type_breakdown: TypeCountItem[];
  domain_breakdown: TypeCountItem[];
  resource_completion: ResourceCompletionItem[];
  overdue_list: OverdueActivityItem[];
  recent: RecentActivityItem[];
}

export interface UpcomingActivityItem {
  id: string;
  client_name: string;
  action_item: string;
  status: string;
  target_closure_date: string;
}

export interface UserDashboardStats {
  total: number;
  by_status: Record<string, number>;
  pending: number;
  done: number;
  overdue: number;
  completion_pct: number;
  type_breakdown: TypeCountItem[];
  upcoming: UpcomingActivityItem[];
  overdue_list: OverdueActivityItem[];
}
