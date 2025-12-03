import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: Exclude<UserRole, null>;
}

/**
 * Wraps any page that requires authentication.
 * Optionally enforces a specific role: 'student' | 'business' | 'admin'.
 */
export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, role, initialized } = useAuth();
  const location = useLocation();

  // 👇 مهم: ننتظر تحميل حالة الـ auth من localStorage
  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
