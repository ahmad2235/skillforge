import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [searchParams] = useSearchParams();
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
      const intent = searchParams.get("intent");
      if (intent === "placement") {
        navigate("/student/placement/intro", { replace: true });
      } else if (userWithRole.role === "student") {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-6">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Join SkillForge and start your learning journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* General Error Alert */}
          {generalError && (
            <div className="rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-3 text-sm text-red-200">
              {generalError}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-200">
                Full name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 ${
                  fieldErrors.name ? "border-red-500" : ""
                }`}
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-400">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
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
                className={`bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 ${
                  fieldErrors.email ? "border-red-500" : ""
                }`}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={`bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 ${
                  fieldErrors.password ? "border-red-500" : ""
                }`}
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200">
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 ${
                  fieldErrors.confirmPassword ? "border-red-500" : ""
                }`}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-400">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Role Selector */}
            <div className="space-y-2">
              <label htmlFor="role" className="block text-sm font-medium text-slate-200">
                I am a
              </label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger
                  id="role"
                  className={`bg-slate-950 border-slate-700 text-slate-100 ${
                    fieldErrors.role ? "border-red-500" : ""
                  }`}
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-700">
                  <SelectItem value="student" className="text-slate-100">
                    Student (Learning Seeker)
                  </SelectItem>
                  <SelectItem value="business" className="text-slate-100">
                    Business (Project Owner)
                  </SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.role && (
                <p className="text-xs text-red-400">{fieldErrors.role}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white mt-2"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-sky-400 hover:text-sky-300 font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
