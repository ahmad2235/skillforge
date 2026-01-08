import type { ReactNode } from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "../lib/apiClient";
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
  // A user is considered authenticated when a user object is present.
  // For session-based auth (Sanctum SPA), token will be null and auth is via cookies.
  const isAuthenticated = !!user;

  // Load cached auth then verify session with backend to avoid redirect loops when cookie exists but cache is empty
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const storedToken = localStorage.getItem("sf_token");
        const storedUser = localStorage.getItem("sf_user");
        const validStoredToken = storedToken && storedToken !== 'undefined' ? storedToken : null;

        if (storedUser) {
          try {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(validStoredToken);
          } catch {
            localStorage.removeItem('sf_user');
            localStorage.removeItem('sf_token');
          }
        } else if (validStoredToken) {
          localStorage.removeItem("sf_token");
        }
      } catch {
        localStorage.removeItem("sf_token");
        localStorage.removeItem("sf_user");
      }

      // Server-side check ensures session cookies are honored even if local cache is empty/stale
      try {
        const response = await apiClient.get("/auth/me");
        if (cancelled) return;
        const serverUser: AuthUser | undefined = (response.data as any)?.user ?? response.data;
        if (serverUser) {
          setUser(serverUser);
          setToken(null);
          localStorage.setItem("sf_user", JSON.stringify(serverUser));
          localStorage.removeItem("sf_token");
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem("sf_user");
          localStorage.removeItem("sf_token");
        }
      } catch {
        if (cancelled) return;
        setUser(null);
        setToken(null);
        localStorage.removeItem("sf_user");
        localStorage.removeItem("sf_token");
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((nextUser: AuthUser, nextToken?: string | null) => {
    setUser(nextUser);
    setToken(nextToken ?? null);

    if (nextToken) {
      localStorage.setItem("sf_token", nextToken);
    } else {
      localStorage.removeItem("sf_token");
    }
    localStorage.setItem("sf_user", JSON.stringify(nextUser));

    if (process.env.NODE_ENV !== 'production') {
      console.debug('AuthProvider: login', { nextUser, nextToken, cookie: document.cookie });
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("sf_token");
    localStorage.removeItem("sf_user");
    if (process.env.NODE_ENV !== 'production') {
      console.debug('AuthProvider: logout, cleared auth state');
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
  }, [logout]);

  const contextValue = useMemo(
    () => ({ user, token, role, isAuthenticated, initialized, login, logout }),
    [user, token, role, isAuthenticated, initialized, login, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
