import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { parseApiError } from "../../lib/apiErrors";
import { useAppToast } from "../../components/feedback/useAppToast";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
// Replacing Alert component (not present) with simple alert container styles

import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type AcceptState = "loading" | "success" | "error" | "already-taken" | "expired" | "invalid";

interface ProjectInfo {
  title: string;
  owner_name?: string;
}

export function AcceptInvitePage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useAppToast();

  const [state, setState] = useState<AcceptState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!assignmentId || !token) {
      setState("invalid");
      setErrorMessage("Invalid invitation link. Missing assignment ID or token.");
      return;
    }

    acceptInvitation(Number(assignmentId), token);
  }, [assignmentId, searchParams]);

  async function acceptInvitation(id: number, token: string) {
    try {
      const response = await apiClient.post(
        `/student/projects/assignments/${id}/accept`,
        { token }
      );

      // Extract project info from response
      const assignment = response.data.data ?? response.data;
      setProjectInfo({
        title: assignment.project?.title || "the project",
        owner_name: assignment.project?.owner?.name || "the business owner",
      });

      setState("success");
      toastSuccess("Invitation accepted! Redirecting to your assignments...");

      // Redirect to assignments page after 3 seconds
      setTimeout(() => {
        navigate("/student/assignments?status=active");
      }, 3000);
    } catch (err: unknown) {
      const errorDetails = parseApiError(err);
      
      // Determine specific error type based on response
      if (errorDetails.message.toLowerCase().includes("already")) {
        setState("already-taken");
        setErrorMessage("This project has already been accepted by another candidate.");
      } else if (errorDetails.message.toLowerCase().includes("expired")) {
        setState("expired");
        setErrorMessage("This invitation has expired. Please contact the business owner for a new invitation.");
      } else if (errorDetails.message.toLowerCase().includes("invalid") || 
                 errorDetails.message.toLowerCase().includes("token")) {
        setState("invalid");
        setErrorMessage("Invalid or tampered invitation link. Please use the original link from your email.");
      } else if (errorDetails.message.toLowerCase().includes("declined")) {
        setState("error");
        setErrorMessage("Cannot accept: You have already declined this invitation.");
      } else {
        setState("error");
        setErrorMessage(errorDetails.message || "Failed to accept invitation. Please try again.");
      }
      
      toastError(errorDetails.message);
    }
  }

  function renderStateContent() {
    switch (state) {
      case "loading":
        return (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary-600 animate-spin" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Accepting Invitation...
            </h2>
            <p className="text-slate-600">
              Please wait while we process your invitation
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Invitation Accepted! 🎉
            </h2>
            {projectInfo && (
              <p className="text-slate-700 mb-4">
                You've successfully accepted <strong>{projectInfo.title}</strong>
                {projectInfo.owner_name && (
                  <> from <strong>{projectInfo.owner_name}</strong></>
                )}
              </p>
            )}
            <p className="text-slate-600 mb-6">
              Redirecting to your assignments...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Auto-redirect in progress</span>
            </div>
          </div>
        );

      case "already-taken":
        return (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-600" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Already Taken
            </h2>
            <div role="alert" className="mt-4 max-w-md mx-auto border-amber-200 bg-amber-50 rounded p-3">
              <p className="text-slate-700">{errorMessage}</p>
            </div>
            <p className="text-slate-600 mt-4">
              Another candidate has already accepted this project. All other invitations have been automatically cancelled.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button
                onClick={() => navigate("/student/assignments")}
                variant="outline"
              >
                View My Assignments
              </Button>
              <Button
                onClick={() => navigate("/student")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        );

      case "expired":
        return (
          <div className="text-center py-12">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Invitation Expired
            </h2>
            <div role="alert" className="mt-4 max-w-md mx-auto border-red-200 bg-red-50 rounded p-3">
              <p className="text-slate-700">{errorMessage}</p>
            </div>
            <p className="text-slate-600 mt-4">
              Invitations are valid for 7 days from the date they were sent.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button
                onClick={() => navigate("/student/assignments")}
                variant="outline"
              >
                View My Assignments
              </Button>
              <Button
                onClick={() => navigate("/student")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        );

      case "invalid":
        return (
          <div className="text-center py-12">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Invalid Invitation
            </h2>
            <div role="alert" className="mt-4 max-w-md mx-auto border-red-200 bg-red-50 rounded p-3">
              <p className="text-slate-700">{errorMessage}</p>
            </div>
            <p className="text-slate-600 mt-4">
              Please check your email for the original invitation link and try again.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button
                onClick={() => navigate("/student/assignments")}
                variant="outline"
              >
                View My Assignments
              </Button>
              <Button
                onClick={() => navigate("/student")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="text-center py-12">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Cannot Accept Invitation
            </h2>
            <div role="alert" className="mt-4 max-w-md mx-auto border-red-200 bg-red-50 rounded p-3">
              <p className="text-slate-700">{errorMessage}</p>
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              <Button
                onClick={() => navigate("/student/assignments")}
                variant="outline"
              >
                View My Assignments
              </Button>
              <Button
                onClick={() => navigate("/student")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <Card className="p-8">
        {renderStateContent()}
      </Card>
    </div>
  );
}
