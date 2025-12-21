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
  // A user is considered authenticated only when BOTH a token and a user object are present.
  const isAuthenticated = !!token && !!user;

  // Load initial state from localStorage once and clean up stale values when mismatched
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("sf_token");
      const storedUser = localStorage.getItem("sf_user");

      if (storedToken && storedUser) {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } else {
        // Clean up any stale or mismatched items
        if (storedToken && !storedUser) {
          // token without a user is invalid -> remove token
          localStorage.removeItem("sf_token");
        }
        if (!storedToken && storedUser) {
          // user without a token is stale -> remove stored user
          localStorage.removeItem("sf_user");
        }
      }
    } catch {
      localStorage.removeItem("sf_token");
      localStorage.removeItem("sf_user");
    } finally {
      setInitialized(true);
    }
  }, []);

  // Sync logout with global event (e.g., 401/403 from axios)
  useEffect(() => {
    function onForcedLogout() {
      logout();
    }
    if (typeof window !== "undefined") {
      window.addEventListener("sf:auth-logout", onForcedLogout);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("sf:auth-logout", onForcedLogout);
      }
    };
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
