import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "../../lib/apiClient";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSubmitted(true);
      setEmail("");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Failed to send reset email. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 px-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-slate-100">Check your email</h2>
            <p className="text-slate-300">
              We've sent a password reset link to your email address. Check your inbox and follow the instructions to reset your password.
            </p>
            <p className="text-sm text-slate-400">
              Didn't receive it? Check your spam folder or{" "}
              <button
                onClick={() => setSubmitted(false)}
                className="text-sky-400 hover:text-sky-300"
              >
                try again
              </button>
              .
            </p>
            <Link to="/auth/login">
              <Button className="w-full bg-sky-600 hover:bg-sky-500 text-white mt-4">
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 px-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white"
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-400">
            Remember your password?{" "}
            <Link to="/auth/login" className="text-sky-400 hover:text-sky-300 font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
