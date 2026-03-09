import axios from "@/utils/axios";
import { AuditLogListResponse } from "@/@types/audit";

export interface AuditFilters {
  page?: number;
  page_size?: number;
  action?: string;
  table_name?: string;
  changed_by_id?: string;
  date_from?: string;
  date_to?: string;
}

export const auditService = {
  getAll: async (filters: AuditFilters = {}): Promise<AuditLogListResponse> => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
    );
    const { data } = await axios.get<AuditLogListResponse>("/audit-logs", { params });
    return data;
  },
};
