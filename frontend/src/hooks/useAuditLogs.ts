import { useState, useEffect, useCallback } from "react";
import { auditService, AuditFilters } from "@/services/auditService";
import { AuditLogListResponse } from "@/@types/audit";

export function useAuditLogs(filters: AuditFilters = {}) {
  const [data, setData] = useState<AuditLogListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await auditService.getAll(filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
