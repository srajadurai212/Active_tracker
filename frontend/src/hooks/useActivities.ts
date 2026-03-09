import { useState, useEffect, useCallback } from "react";
import { activityService, ActivityFilters } from "@/services/activityService";
import { Activity, ActivityListResponse } from "@/@types/activity";

export function useActivities(filters: ActivityFilters = {}) {
  const [data, setData] = useState<ActivityListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await activityService.getAll(filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch activities");
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

export function useActivity(id: string | undefined) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    activityService
      .getById(id)
      .then(setActivity)
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setIsLoading(false));
  }, [id]);

  return { activity, isLoading, error };
}
