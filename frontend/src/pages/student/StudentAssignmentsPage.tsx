import { useCallback, useEffect, useState, FormEvent } from "react";
import { apiClient } from "../../lib/apiClient";
import { ApiStateCard } from "../../components/shared/ApiStateCard";
import { parseApiError } from "../../lib/apiErrors";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useAppToast } from "../../components/feedback/useAppToast";
import type { AssignmentStatus, ProjectAssignment } from "../../types/projects";
import { Link, useNavigate } from "react-router-dom";

const STATUS_TABS: AssignmentStatus[] = ["pending", "active", "completed"];

export function StudentAssignmentsPage() {
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useAppToast();
  const [status, setStatus] = useState<AssignmentStatus>("pending");

  // Ensure backward compat: map old 'invited' status to 'pending' when loading filters from query strings
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('status');
    if (q === 'invited') setStatus('pending');
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  // Local UI state to hide specific invitations and show per-assignment inline errors
  const [hiddenAssignments, setHiddenAssignments] = useState<number[]>([]);
  const [assignmentErrors, setAssignmentErrors] = useState<Record<number, string>>({});

  // Feedback dialog state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/student/projects/assignments", {
        params: { status },
      });
      const data = response.data.data ?? response.data;
      setAssignments(data as ProjectAssignment[]);
    } catch (err: unknown) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  async function handleAccept(assignmentId: number) {
    try {
      const response = await apiClient.post(
        `/student/projects/assignments/${assignmentId}/accept`
      );
      
      const { team_message } = response.data;
      
      if (team_message) {
        toastSuccess(team_message);
      } else {
        toastSuccess("Assignment accepted!");
      }
      
      setStatus("active"); // Switch to active tab after accepting
      await fetchAssignments();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to accept assignment";
      toastError(message);

      // If the project was already taken, show an inline message for this assignment with a Hide button
      if (message === 'This project has already been accepted by another student.') {
        setAssignmentErrors((prev) => ({ ...prev, [assignmentId]: message }));
      }

      // Refresh the list to remove invalid invitations (e.g., already accepted by another student)
      await fetchAssignments();
    }
  }

  async function handleDecline(assignmentId: number) {
    try {
      await apiClient.post(
        `/student/projects/assignments/${assignmentId}/decline`
      );
      toastSuccess("Assignment declined");
      await fetchAssignments();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to decline assignment";
      toastError(message);
      await fetchAssignments();
    }
  }

  function openFeedbackDialog(assignment: any) {
    setSelectedAssignment(assignment);
    setFeedbackRating(assignment.student_rating || 5);
    setFeedbackText(assignment.student_feedback || "");
    setFeedbackDialogOpen(true);
  }

  async function handleSubmitFeedback(e: FormEvent) {
    e.preventDefault();
    if (!selectedAssignment) return;

    setIsSubmittingFeedback(true);
    try {
      await apiClient.post(
        `/student/projects/assignments/${selectedAssignment.id}/feedback`,
        {
          rating: feedbackRating,
          feedback: feedbackText || null,
        }
      );
      toastSuccess("Feedback submitted successfully");
      setFeedbackDialogOpen(false);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to submit feedback";
      toastError(message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (error) {
    const parsed = parseApiError(error);
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind={parsed.kind} description={parsed.message} primaryActionLabel="Retry" onPrimaryAction={fetchAssignments} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Your Project Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Review invitations, active projects, and completed work.
        </p>
      </header>

      <div className="flex gap-2 border-b border-border pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatus(tab)}
            className={`rounded-md border px-3 py-1 text-sm capitalize transition ${
              status === tab
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {assignments.length === 0 ? (
        <Card className="space-y-3 p-6 text-center">
          <h3 className="text-lg font-semibold text-foreground">No {status} assignments</h3>
          <p className="text-sm text-muted-foreground">
            {status === "pending" && "You don't have any pending invitations."}
            {status === "active" && "You don't have any active projects right now."}
            {status === "completed" && "You haven't completed any projects yet."}
          </p>
          {status !== "pending" && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => navigate("/student/roadmap")}>Continue Learning</Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            // Skip assignments the user has chosen to hide client-side
            if (hiddenAssignments.includes(assignment.id)) return null;

            const project = assignment.project;
            const hasGivenFeedback = assignment.student_rating != null;

            const isTeamInvite = !!assignment.team_id;
            const teammates = (assignment.team?.assignments || [])
              .filter((a: any) => a.user_id !== assignment.user_id)
              .map((a: any) => a.user);
            const isFrozen = assignment.status === 'frozen';

            return (
              <Card key={assignment.id} className="p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {project?.title ?? `Assignment #${assignment.id}`}
                  </h2>
                  <Badge variant="outline" className="capitalize">
                    {assignment.status}
                  </Badge>
                </div>
                {project?.description && (
                  <p className="mb-2 line-clamp-3 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}

                {isTeamInvite && (
                  <div className="mt-2 rounded-md border border-violet-700/30 bg-violet-950/20 p-3">
                    <p className="text-xs text-violet-200 font-medium mb-1">Team Invitation</p>
                    {teammates && teammates.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {teammates.map((m: any) => (
                          <span key={m.id} className="px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700/50 text-slate-200">
                            {m.name || m.email} · {m.domain || 'domain'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Waiting for teammates to be invited.</p>
                    )}
                    {isFrozen && (
                      <p className="text-xs text-amber-200 mt-2">This team invite is temporarily frozen due to a teammate declining. Please wait while the business finds a replacement.</p>
                    )}
                  </div>
                )}

                {/* Business info if available */}
                {project?.owner && (
                  <p className="text-xs text-muted-foreground mb-2">
                    By: {project.owner.name ?? project.owner.email}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {assignmentErrors[assignment.id] && (
                    <div className="w-full mb-2 flex items-center justify-between rounded border border-amber-500/20 bg-amber-600/10 p-3">
                      <p className="text-sm text-amber-100">{assignmentErrors[assignment.id]}</p>
                      <div className="ml-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          // Hide it client-side immediately
                          setHiddenAssignments(prev => [...prev, assignment.id]);
                          setAssignmentErrors(prev => {
                            const { [assignment.id]: _, ...rest } = prev;
                            return rest;
                          });
                        }}>Hide</Button>
                      </div>
                    </div>
                  )}

                  {status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(assignment.id)}
                        className="bg-emerald-600 hover:bg-emerald-500"
                        disabled={isFrozen}
                      >
                        {isFrozen ? 'Frozen' : 'Accept'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDecline(assignment.id)}
                      >
                        Decline
                      </Button>
                    </>
                  )}

                  {status === "active" && (
                    <>
                      <Link to={`/student/assignments/${assignment.id}/milestones`}>
                        <Button size="sm">View Milestones</Button>
                      </Link>
                    </>
                  )}

                  {status === "completed" && (
                    <>
                      <Link to={`/student/projects/assignments/${assignment.id}/portfolio`}>
                        <Button size="sm">Add to Portfolio</Button>
                      </Link>
                      <Link to="/student/portfolios">
                        <Button size="sm" variant="outline">View Portfolio</Button>
                      </Link>
                      {!hasGivenFeedback ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openFeedbackDialog(assignment)}
                        >
                          Leave Feedback
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="py-1 px-2">
                          ★ {assignment.student_rating}/5 - Feedback given
                        </Badge>
                      )}

                      {/* Show business feedback if received */}
                      {assignment.business_feedback && (
                        <div className="w-full mt-2 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Business feedback ({assignment.business_rating}/5):
                          </p>
                          <p className="text-sm text-foreground">{assignment.business_feedback}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitFeedback} className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Rate your experience working on "{selectedAssignment?.project?.title}"
            </p>

            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= feedbackRating
                        ? "text-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedbackText">Your Feedback (optional)</Label>
              <Textarea
                id="feedbackText"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your experience working with this business..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFeedbackDialogOpen(false)}
                disabled={isSubmittingFeedback}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingFeedback}>
                {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
