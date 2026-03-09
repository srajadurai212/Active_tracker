import axios from "@/utils/axios";
import { Activity, ActivityCreate, ActivityUpdate, ActivityListResponse, TargetDateHistory } from "@/@types/activity";
import { AuditLog } from "@/@types/audit";

export interface ActivityFilters {
  page?: number;
  page_size?: number;
  status?: string | string[];
  assigned_to_id?: string | string[];
  client_name?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  overdue_only?: boolean;
}

export const activityService = {
  getAll: async (filters: ActivityFilters = {}): Promise<ActivityListResponse> => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
    );
    const { data } = await axios.get<ActivityListResponse>("/activities", { params });
    return data;
  },

  getById: async (id: string): Promise<Activity> => {
    const { data } = await axios.get<Activity>(`/activities/${id}`);
    return data;
  },

  create: async (payload: ActivityCreate): Promise<Activity> => {
    const { data } = await axios.post<Activity>("/activities", payload);
    return data;
  },

  update: async (id: string, payload: ActivityUpdate): Promise<Activity> => {
    const { data } = await axios.put<Activity>(`/activities/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/activities/${id}`);
  },

  getHistory: async (id: string): Promise<AuditLog[]> => {
    const { data } = await axios.get<AuditLog[]>(`/activities/${id}/history`);
    return data;
  },

  getTargetDateHistory: async (id: string): Promise<TargetDateHistory[]> => {
    const { data } = await axios.get<TargetDateHistory[]>(`/activities/${id}/target-date-history`);
    return data;
  },

  getStatusCounts: async (assigned_to_ids?: string[], overdue_only?: boolean): Promise<Record<string, number>> => {
    const params: Record<string, unknown> = {};
    if (assigned_to_ids && assigned_to_ids.length > 0) params.assigned_to_id = assigned_to_ids;
    if (overdue_only) params.overdue_only = true;
    const { data } = await axios.get<Record<string, number>>("/activities/counts", { params });
    return data;
  },

  approve: async (id: string): Promise<Activity> => {
    const { data } = await axios.post<Activity>(`/activities/${id}/approve`);
    return data;
  },

  reject: async (id: string, reason?: string): Promise<Activity> => {
    const { data } = await axios.post<Activity>(`/activities/${id}/reject`, { reason: reason || null });
    return data;
  },
};
