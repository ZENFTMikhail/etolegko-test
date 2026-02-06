import { createContext } from "react";

export type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
};

export type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    name: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
