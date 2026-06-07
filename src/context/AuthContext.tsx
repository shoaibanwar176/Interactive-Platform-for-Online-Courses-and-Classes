import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, name: string, role: string, password: string, bio?: string) => Promise<User>;
  logout: () => void;
  updateUserBio: (bio: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session elements on startup
    const savedToken = localStorage.getItem("lms_token");
    const savedUser = localStorage.getItem("lms_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem("lms_token", receivedToken);
      localStorage.setItem("lms_user", JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Invalid username or password credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, name: string, role: string, password: string, bio?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/register", { email, name, role, password, bio });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem("lms_token", receivedToken);
      localStorage.setItem("lms_user", JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Registration process failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_user");
    setToken(null);
    setUser(null);
  };

  const updateUserBio = (bio: string) => {
    if (user) {
      const updated = { ...user, bio };
      localStorage.setItem("lms_user", JSON.stringify(updated));
      setUser(updated);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    register,
    logout,
    updateUserBio
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be consumed from within an AuthProvider context layer.");
  }
  return context;
};
