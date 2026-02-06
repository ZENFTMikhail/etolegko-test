import { api } from "./axios";

export interface GenerateTestOrdersDto {
  count: number;
}

export interface CreateOrderDto {
  amount: number;
  promoCode?: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
}

export const ordersService = {
  async generateTestOrders(
    data: GenerateTestOrdersDto,
  ): Promise<OrderResponse> {
    const response = await api.post<OrderResponse>(
      "/orders/generate-test",
      data,
    );
    return response.data;
  },

  async createOrder(data: CreateOrderDto): Promise<OrderResponse> {
    const response = await api.post<OrderResponse>("/orders/create", data);
    return response.data;
  },
};
