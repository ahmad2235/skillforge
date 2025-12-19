import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
import { useAuth } from "../../hooks/useAuth";
import type { AuthUser } from "../../context/AuthContext";

type UserRole = "student" | "business";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Client-side validation
  function validateForm(): boolean {
    const errors: FieldErrors = {};

    // Name validation
    if (!name.trim()) {
      errors.name = "Name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (name.trim().length > 100) {
      errors.name = "Name must not exceed 100 characters";
    }

    // Email validation
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Role validation
    if (!role) {
      errors.role = "Please select a role";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Call backend register endpoint
      // Note: Backend doesn't accept role, so we only send name, email, password
      const response = await apiClient.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      const responseData = response.data as {
        user: AuthUser;
        token: string;
      };

      // Backend may not return role, so use the selected role from form
      const userWithRole: AuthUser = {
        ...responseData.user,
        role: (role as "student" | "business") || responseData.user.role || null,
      };

      // Store in auth context and localStorage
      login(userWithRole, responseData.token);

      // Redirect based on role
      if (userWithRole.role === "student") {
        navigate("/student");
      } else if (userWithRole.role === "business") {
        navigate("/business");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      // Handle backend validation errors
      if (err?.status === 422) {
        const backendErrors = err?.errors || {};
        const newFieldErrors: FieldErrors = {};

        // Map backend field errors to our state
        if (backendErrors.name) {
          newFieldErrors.name = Array.isArray(backendErrors.name)
            ? backendErrors.name[0]
            : backendErrors.name;
        }
        if (backendErrors.email) {
          newFieldErrors.email = Array.isArray(backendErrors.email)
            ? backendErrors.email[0]
            : backendErrors.email;
        }
        if (backendErrors.password) {
          newFieldErrors.password = Array.isArray(backendErrors.password)
            ? backendErrors.password[0]
            : backendErrors.password;
        }
        if (backendErrors.role) {
          newFieldErrors.role = Array.isArray(backendErrors.role)
            ? backendErrors.role[0]
            : backendErrors.role;
        }

        setFieldErrors(newFieldErrors);

        // Show general error if validation errors exist
        if (Object.keys(newFieldErrors).length > 0) {
          setGeneralError("Please fix the errors below");
        }
      } else {
        // Other errors (network, server, etc.)
        safeLogError(err, "Register");
        setGeneralError(getSafeErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-lg p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-sm text-slate-400 mt-1">
              Join SkillForge and start your learning journey
            </p>
          </div>

          {/* General Error Alert */}
          {generalError && (
            <div className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-100">
              {generalError}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-1">
              <label htmlFor="name" className="block text-sm font-medium text-slate-200">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-md px-3 py-2 text-sm border bg-slate-950 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                  fieldErrors.name
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-700"
                }`}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
              {fieldErrors.name && (
                <p id="name-error" className="text-xs text-red-400">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={`w-full rounded-md px-3 py-2 text-sm border bg-slate-950 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                  fieldErrors.email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-700"
                }`}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-xs text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full rounded-md px-3 py-2 text-sm border bg-slate-950 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                  fieldErrors.password
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-700"
                }`}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />
              {fieldErrors.password && (
                <p id="password-error" className="text-xs text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full rounded-md px-3 py-2 text-sm border bg-slate-950 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                  fieldErrors.confirmPassword
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-700"
                }`}
                aria-invalid={!!fieldErrors.confirmPassword}
                aria-describedby={fieldErrors.confirmPassword ? "confirm-error" : undefined}
              />
              {fieldErrors.confirmPassword && (
                <p id="confirm-error" className="text-xs text-red-400">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Role Selector */}
            <div className="space-y-1">
              <label htmlFor="role" className="block text-sm font-medium text-slate-200">
                I am a
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className={`w-full rounded-md px-3 py-2 text-sm border bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                  fieldErrors.role
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-700"
                }`}
                aria-invalid={!!fieldErrors.role}
                aria-describedby={fieldErrors.role ? "role-error" : undefined}
              >
                <option value="student">Student (Learning Seeker)</option>
                <option value="business">Business (Project Owner)</option>
              </select>
              {fieldErrors.role && (
                <p id="role-error" className="text-xs text-red-400">
                  {fieldErrors.role}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2 text-sm font-medium text-white transition mt-6"
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                to="/auth/login"
                className="text-sky-400 hover:text-sky-300 font-medium transition"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
