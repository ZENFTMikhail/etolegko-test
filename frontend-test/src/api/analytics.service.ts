import { api } from "./axios";

export interface UserAnalytics {
  user_id: string;
  email: string;
  name: string;
  total_orders: number;
  total_amount: number;
  total_discount: number;
  avg_order_amount: number;
  promo_codes_used: number;
  first_order_date: string;
  last_order_date: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Filters {
  sortBy: string;
  sortOrder: 'desc' | 'asc';
}

export interface Metadata {
  source: string;
  timestamp: string;
}

export interface AnalyticsResponse {
  success: boolean;
  data: UserAnalytics[];
  pagination: Pagination;
  filters: Filters;
  metadata: Metadata;
}

export interface AnalyticsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'desc' | 'asc';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const analyticsService = {
  async getUsersTable(params?: AnalyticsParams): Promise<AnalyticsResponse> {
    const response = await api.get<AnalyticsResponse>("/analytics/users-table", {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        sortBy: params?.sortBy || 'total_amount',
        sortOrder: params?.sortOrder || 'desc',
        ...params,
      },
    });
    return response.data;
  },
};