import { type ReactNode, useState, useEffect } from "react";
import { AuthContext, type User } from "./AuthContext";
import { authService } from "../api/auth.service";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
  const initAuth = async () => {
    const token = localStorage.getItem("token");

    console.log("Token from localStorage:", token);


    if (token) {
      try {
        const userData = await authService.getProfile();
          console.log("User data restored:", userData);
        setUser(userData);
      } catch {
        localStorage.removeItem("token");
      }
    }

    setIsLoading(false);
  };

  initAuth();
}, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login({ email, password });
      console.log(data)
      localStorage.setItem("token", data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    name: string;
    phone: string;
    password: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      localStorage.setItem("token", res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
