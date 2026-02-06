import { api } from "./axios";

export type RegisterDto = {
  email: string;
  name: string;
  phone: string;
  password: string;
};

type ResponseUser = {
  id: number;
  email: string;
  name: string;
  phone: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type AuthResponse = {
  access_token: string;
  user: {
    id: number;
    email: string;
    name: string;
    phone: string;
  };
};

export const authService = {
  async register(dto: RegisterDto) {
    const res = await api.post<AuthResponse>("/auth/register", dto);
    return res.data;
  },

  async getProfile() {
    const res = await api.get<ResponseUser>("/auth/profile");
    return res.data;
  
  },

  async login(dto: LoginDto) {
    const res = await api.post<AuthResponse>("/auth/login", dto);
    return res.data;
  },
};
