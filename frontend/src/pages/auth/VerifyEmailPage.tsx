import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendStatus("idle");
    setResendMessage(null);

    try {
      const response = await apiClient.post("/auth/email/resend");
      setResendStatus("success");
      setResendMessage(response.data.message || "Verification email sent successfully!");
    } catch (error: any) {
      setResendStatus("error");
      setResendMessage(
        error?.response?.data?.message || "Failed to resend verification email. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 px-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription className="text-slate-400">
            We've sent a verification link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-900/20 border border-blue-700/50 px-4 py-4 text-sm text-blue-200">
              <p className="font-medium mb-2">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>Return here to login</li>
              </ol>
            </div>

            {resendStatus === "success" && (
              <div className="rounded-lg bg-green-900/20 border border-green-700/50 px-4 py-3 text-sm text-green-200 flex items-start gap-2">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{resendMessage}</span>
              </div>
            )}

            {resendStatus === "error" && (
              <div className="rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-3 text-sm text-red-200 flex items-start gap-2">
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{resendMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={isResending}
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Resend Verification Email"
                )}
              </Button>

              <div className="text-center text-sm text-slate-400">
                Already verified?{" "}
                <Link to="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
                  Login here
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              Didn't receive the email? Check your spam folder or click the resend button above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
