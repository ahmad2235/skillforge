import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AuthUser, UserRole } from "./AuthContext";
import { AuthContext } from "./AuthContext";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const role: UserRole = user?.role ?? null;
  const isAuthenticated = !!token;

  // Load initial state from localStorage once
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("sf_token");
      const storedUser = localStorage.getItem("sf_user");

      if (storedToken && storedUser) {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      }
    } catch {
      localStorage.removeItem("sf_token");
      localStorage.removeItem("sf_user");
    } finally {
      setInitialized(true);
    }
  }, []);

  function login(nextUser: AuthUser, nextToken: string) {
    setUser(nextUser);
    setToken(nextToken);

    localStorage.setItem("sf_token", nextToken);
    localStorage.setItem("sf_user", JSON.stringify(nextUser));
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("sf_token");
    localStorage.removeItem("sf_user");
  }

  return (
    <AuthContext.Provider
      value={{ user, token, role, isAuthenticated, initialized, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
