import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, ensureCsrfCookie, unauthenticatedClient } from "../../lib/apiClient";
import { useAuth } from "../../hooks/useAuth";
import type { AuthUser } from "../../context/AuthContext";
import '../../styles/AnimatedBackground.css';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure any stale bearer token is removed before attempting login.
      // If a stale token exists, apiClient would attach Authorization header
      // to unrelated requests and the server would reject them (causing
      // immediate 401 -> forced logout race). Remove it now and rely on
      // session-based auth for the SPA.
      try { localStorage.removeItem('sf_token'); } catch {}

      // Ensure we have a fresh CSRF cookie before attempting login.
      // This is awaited to avoid a race where the token rotates between
      // fetching it and reading the cookie to set the header.
      await ensureCsrfCookie();

      // Use an unauthenticated client for the login request to avoid sending any
      // stale Authorization header (some users may have old tokens in localStorage)
      const response = await unauthenticatedClient.post("/auth/login", {
        email,
        password,
      });

      const { user } = response.data as { user: AuthUser };

      // Debug info: server response and cookies
      if (process.env.NODE_ENV !== 'production') {
        console.debug('LoginPage: login response', { user, cookie: document.cookie });
      }

      // Verify session-based auth server-side before committing auth state and navigating.
      // We already called ensureCsrfCookie() before login, so now a simple GET to /auth/me
      // will confirm the server has set the session cookie for the SPA.
      try {
        // Verify session using an unauthenticated client to avoid any Authorization
        // header being present (server rejects Bearer headers for SPA flows).
        await unauthenticatedClient.get('/auth/me');
      } catch (verifyErr) {
        setError('Login succeeded but session could not be established. Please try again or contact support.');
        return;
      }

      // Session verified - now commit client-side auth state
      login(user, null);

      const intent = searchParams.get("intent");
      if (intent === "placement") {
        navigate("/student/placement/intro", { replace: true });
      } else if (user.role === "student") navigate("/student");
      else if (user.role === "business") navigate("/business");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (err: any) {
      // Check for email verification error (403)
      if (err?.response?.status === 403) {
        const message = err?.response?.data?.message || "";
        if (message.toLowerCase().includes("verify") || message.toLowerCase().includes("email")) {
          // Redirect to verify email page
          navigate("/auth/verify-email", { replace: true });
          return;
        }
      }

      const message =
        err?.response?.data?.message ||
        "Failed to login. Please check your credentials.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // safe loading flag (works whether component uses isSubmitting)
  const formSubmitting = !!isSubmitting;

  return (
    <div className="animated-gradient-background px-4">
      <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl shadow-black/20 animate-card-enter">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your SkillForge account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={formSubmitting}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : "email-help"}
              />
              <p id="email-help" className="text-xs text-slate-500">
                {/* ...existing helper text or keep blank */}
              </p>
              {error && (
                <p id="email-error" role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Password
                </label>
                <Link to="/auth/forgot-password" className="text-xs text-brand hover:text-brand/80 transition-colors">
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                aria-invalid={!!error}
                aria-describedby={error ? "password-error" : "password-help"}
              />
              <p id="password-help" className="text-xs text-slate-500">
                {/* ...existing helper text or keep blank */}
              </p>
              {error && (
                <p id="password-error" role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white inline-flex items-center justify-center gap-2"
              aria-busy={formSubmitting}
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-brand hover:text-brand/80 font-medium transition-colors">
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
