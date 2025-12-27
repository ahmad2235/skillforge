import { useEffect, useState, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
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
import { Input } from "../../components/ui/input";
import { useAppToast } from "../../components/feedback/useAppToast";
import { SkeletonList } from "../../components/feedback/Skeletons";

type Milestone = {
  id: number;
  title: string;
  description?: string;
  order_index: number;
  due_date?: string;
  is_required: boolean;
  submission?: MilestoneSubmission | null;
};

type MilestoneSubmission = {
  id: number;
  status: "submitted" | "reviewed" | "approved" | "rejected";
  answer_text?: string;
  attachment_url?: string;
  review_feedback?: string;
  reviewed_at?: string;
};

type Assignment = {
  id: number;
  project_id: number;
  status: string;
  project?: {
    id: number;
    title: string;
    description?: string;
  };
};

const STATUS_COLORS: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string; label: string }> = {
  pending: { variant: "outline", label: "Not submitted" },
  submitted: { variant: "default", className: "bg-blue-600", label: "Submitted" },
  reviewed: { variant: "secondary", label: "Under review" },
  approved: { variant: "default", className: "bg-emerald-600", label: "Approved" },
  rejected: { variant: "destructive", label: "Needs revision" },
};

export function StudentAssignmentMilestonesPage() {
  const { assignmentId } = useParams();
  const { toastSuccess, toastError } = useAppToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submit dialog state
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMilestones = async () => {
    if (!assignmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/student/projects/assignments/${assignmentId}/milestones`
      );
      const data = response.data.data ?? response.data;
      
      // The API may return milestones with their submissions embedded
      if (Array.isArray(data)) {
        setMilestones(data as Milestone[]);
      } else if (data.milestones) {
        setMilestones(data.milestones as Milestone[]);
        if (data.assignment) {
          setAssignment(data.assignment as Assignment);
        }
      }
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ??
        "Failed to load milestones for this assignment.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMilestones();
  }, [assignmentId]);

  const openSubmitDialog = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setAnswerText(milestone.submission?.answer_text || "");
    setAttachmentUrl(milestone.submission?.attachment_url || "");
    setSubmitDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone || !assignmentId) return;

    if (!answerText.trim() && !attachmentUrl.trim()) {
      toastError("Please provide an answer or attachment URL");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(
        `/student/projects/assignments/${assignmentId}/milestones/${selectedMilestone.id}/submit`,
        {
          answer_text: answerText || null,
          attachment_url: attachmentUrl || null,
        }
      );
      toastSuccess("Milestone submitted successfully");
      setSubmitDialogOpen(false);
      setSelectedMilestone(null);
      loadMilestones();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to submit milestone";
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!assignmentId) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">No assignment selected.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="border-destructive bg-destructive/10 p-6">
          <p className="text-destructive text-sm">{error}</p>
          <Link to="/student/assignments" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Back to assignments</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const completedCount = milestones.filter(m => m.submission?.status === "approved").length;
  const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {assignment?.project?.title ?? "Project Milestones"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Complete the milestones below to finish this project
            </p>
          </div>
          <Link to="/student/assignments">
            <Button variant="outline" size="sm">Back to assignments</Button>
          </Link>
        </div>

        {/* Progress indicator */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">{completedCount}/{milestones.length} completed</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {milestones.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">No milestones defined for this project yet.</p>
          <p className="text-muted-foreground text-xs mt-2">
            The project owner will add milestones soon.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {milestones
            .sort((a, b) => a.order_index - b.order_index)
            .map((milestone, index) => {
              const submissionStatus = milestone.submission?.status || "pending";
              const statusInfo = STATUS_COLORS[submissionStatus] || STATUS_COLORS.pending;
              const canSubmit = submissionStatus === "pending" || submissionStatus === "rejected";

              return (
                <Card key={milestone.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-foreground">
                          {milestone.title}
                        </h3>
                        {milestone.is_required && (
                          <span className="text-xs text-destructive">Required</span>
                        )}
                        <Badge variant={statusInfo.variant} className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mb-2 ml-8">
                          {milestone.description}
                        </p>
                      )}

                      {milestone.due_date && (
                        <p className="text-xs text-muted-foreground ml-8">
                          Due: {new Date(milestone.due_date).toLocaleDateString()}
                        </p>
                      )}

                      {/* Show review feedback if rejected */}
                      {milestone.submission?.status === "rejected" && milestone.submission?.review_feedback && (
                        <div className="mt-2 ml-8 p-3 bg-destructive/10 rounded-lg">
                          <p className="text-xs font-medium text-destructive mb-1">Revision requested:</p>
                          <p className="text-sm text-foreground">{milestone.submission.review_feedback}</p>
                        </div>
                      )}

                      {/* Show approval feedback */}
                      {milestone.submission?.status === "approved" && milestone.submission?.review_feedback && (
                        <div className="mt-2 ml-8 p-3 bg-emerald-500/10 rounded-lg">
                          <p className="text-xs font-medium text-emerald-600 mb-1">Reviewer feedback:</p>
                          <p className="text-sm text-foreground">{milestone.submission.review_feedback}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {canSubmit && (
                        <Button size="sm" onClick={() => openSubmitDialog(milestone)}>
                          {submissionStatus === "rejected" ? "Resubmit" : "Submit"}
                        </Button>
                      )}
                      {milestone.submission?.status === "submitted" && (
                        <p className="text-xs text-muted-foreground">Awaiting review</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit: {selectedMilestone?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {selectedMilestone?.description && (
              <p className="text-sm text-muted-foreground">
                {selectedMilestone.description}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="answer">Your Answer</Label>
              <Textarea
                id="answer"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Describe your work, approach, or solution..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">Attachment URL (optional)</Label>
              <Input
                id="attachment"
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://github.com/... or https://drive.google.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Link to your code repository, demo, or file
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Milestone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
