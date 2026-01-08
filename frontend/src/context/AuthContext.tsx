import { createContext } from "react";

export type UserRole = "student" | "business" | "admin" | null;

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  level?: string | null;
  domain?: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  initialized: boolean;
  login: (user: AuthUser, token?: string | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
