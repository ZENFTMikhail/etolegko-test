import { useState, useEffect, useCallback } from "react";
import {
  analyticsService,
  type AnalyticsResponse,
  type AnalyticsParams,
  type UserAnalytics,
  type Filters,
} from "../api/analytics.service";

interface UseAnalyticsReturn {
  data: UserAnalytics[];
  pagination: AnalyticsResponse["pagination"];
  filters: Filters;
  metadata: AnalyticsResponse["metadata"];
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

export const useAnalytics = (
  initialParams?: AnalyticsParams,
): UseAnalyticsReturn => {
  const [data, setData] = useState<UserAnalytics[]>([]);
  const [pagination, setPagination] = useState<AnalyticsResponse["pagination"]>(
    {
      page: 1,
      limit: 20,
      total: 0,
      pages: 1,
    },
  );
  const [filters, setFilters] = useState<Filters>({
    sortBy: "total_amount",
    sortOrder: "desc",
  });
  const [metadata, setMetadata] = useState<AnalyticsResponse["metadata"]>({
    source: "",
    timestamp: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentParams] = useState<AnalyticsParams>(initialParams || {});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadData = useCallback(
    async (params?: AnalyticsParams) => {
      setIsLoading(true);
      setError(null);

      try {
        const requestParams = { ...currentParams, ...params };
        const response = await analyticsService.getUsersTable(requestParams);
        setData(response.data);
        setPagination(response.pagination);
        setFilters(response.filters);
        setMetadata(response.metadata);
      } catch (err) {
        console.log(err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentParams],
  );

  useEffect(() => {
    console.log("🔍 Загружаю данные аналитики...");
    loadData();
  }, [refreshTrigger, loadData]);

  const refreshData = useCallback(() => {
    console.log("🔄 Триггер обновления данных");
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return {
    data,
    pagination,
    filters,
    metadata,
    isLoading,
    error,
    refreshData,
  };
};
