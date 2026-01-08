import { useEffect, useState } from "react";
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
import { useAppToast } from "../../components/feedback/useAppToast";
import { SkeletonList } from "../../components/feedback/Skeletons";

type MilestoneData = {
  milestone: {
    id: number;
    title: string;
    description?: string;
    order_index: number;
    is_required: boolean;
  };
  submission?: {
    id: number;
    status: "submitted" | "reviewed" | "approved" | "rejected";
    answer_text?: string;
    attachment_url?: string;
    review_feedback?: string;
    created_at: string;
  } | null;
};

const STATUS_COLORS: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string; label: string }> = {
  pending: { variant: "outline", label: "Not submitted" },
  submitted: { variant: "default", className: "bg-blue-600", label: "Needs Review" },
  reviewed: { variant: "secondary", label: "Under review" },
  approved: { variant: "default", className: "bg-emerald-600", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
};

export function BusinessProjectSubmissionReviewPage() {
  const { projectId, assignmentId } = useParams();
  const { toastSuccess, toastError } = useAppToast();
  const [data, setData] = useState<MilestoneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Complete project dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeFeedback, setCompleteFeedback] = useState("");
  const [completeRating, setCompleteRating] = useState<number>(5);
  const [isCompleting, setIsCompleting] = useState(false);

  const loadData = async () => {
    if (!assignmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/business/projects/assignments/${assignmentId}/submissions`
      );
      const responseData = response.data.data ?? response.data;
      setData(responseData as MilestoneData[]);
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ??
        "Failed to load submissions.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [assignmentId]);

  const openReviewDialog = (submission: any) => {
    setSelectedSubmission(submission);
    setReviewStatus("approved");
    setReviewFeedback("");
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedSubmission) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(
        `/business/projects/submissions/${selectedSubmission.id}/review`,
        {
          status: reviewStatus,
          feedback: reviewFeedback || null,
        }
      );
      toastSuccess(`Submission ${reviewStatus}`);
      setReviewDialogOpen(false);
      setSelectedSubmission(null);
      loadData();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to submit review";
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteProject = async () => {
    if (!assignmentId) return;
    setIsCompleting(true);
    try {
      await apiClient.post(
        `/business/projects/assignments/${assignmentId}/complete`,
        {
          feedback: completeFeedback || null,
          rating: completeRating,
        }
      );
      toastSuccess("Assignment marked as completed");
      setCompleteDialogOpen(false);
      // Navigate back to assignments
      window.location.href = `/business/projects/${projectId}/assignments`;
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to complete assignment";
      toastError(message);
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="border-destructive bg-destructive/10 p-6">
          <p className="text-destructive text-sm">{error}</p>
          <Link to={`/business/projects/${projectId}/assignments`} className="mt-4 inline-block">
            <Button variant="outline" size="sm">Back to assignments</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6 animate-page-enter">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Review Submissions</h1>
          <p className="text-muted-foreground text-sm">
            Review student work for each milestone
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/business/projects/${projectId}/assignments`}>
            <Button variant="outline" size="sm">Back to assignments</Button>
          </Link>
        </div>
      </header>

      <div className="space-y-4">
        {data.map((item, index) => {
          const { milestone, submission } = item;
          const status = submission?.status || "pending";
          const statusInfo = STATUS_COLORS[status] || STATUS_COLORS.pending;

          return (
            <Card key={milestone.id} className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-semibold">{milestone.title}</h3>
                    <Badge variant={statusInfo.variant} className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground ml-8">
                    {milestone.description}
                  </p>
                  
                  {submission ? (
                    <div className="ml-8 mt-4 p-4 bg-muted/30 rounded-lg space-y-3 border border-border">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Submitted: {new Date(submission.created_at).toLocaleString()}</span>
                      </div>
                      
                      {submission.answer_text && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">Student Answer:</p>
                          <p className="text-sm whitespace-pre-wrap">{submission.answer_text}</p>
                        </div>
                      )}
                      
                      {submission.attachment_url && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">Attachment:</p>
                          <a 
                            href={submission.attachment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {submission.attachment_url}
                          </a>
                        </div>
                      )}

                      {submission.review_feedback && (
                        <div className={`mt-3 p-3 rounded text-sm ${
                          submission.status === 'rejected' ? 'bg-destructive/10 text-destructive-foreground' : 'bg-emerald-500/10 text-emerald-100'
                        }`}>
                          <span className="font-semibold">Your Feedback:</span> {submission.review_feedback}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="ml-8 mt-2 text-sm text-muted-foreground italic">
                      No submission yet.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[150px]">
                  {submission && submission.status === 'submitted' && (
                    <Button onClick={() => openReviewDialog(submission)}>
                      Review
                    </Button>
                  )}
                  {submission && (submission.status === 'approved' || submission.status === 'rejected') && (
                    <Button variant="outline" size="sm" onClick={() => openReviewDialog(submission)}>
                      Update Review
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Complete Project Card */}
      <Card className="border-emerald-500/30 bg-emerald-900/40 p-6 shadow-xl shadow-slate-950/30 transition-shadow duration-200">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-emerald-500/20 rounded-full">
                <span className="text-emerald-200 text-sm">✓</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Complete Assignment</h3>
                <p className="text-sm text-muted-foreground">All milestones reviewed • Ready to finalize</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Rate the student's performance and provide final feedback to complete this assignment.
            </p>
          </div>

          <Button
            onClick={() => setCompleteDialogOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-slate-950/40 transition-all duration-200 px-6 py-2"
            size="default"
          >
            Complete Project
          </Button>
        </div>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Decision</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={reviewStatus === "approved" ? "default" : "outline"}
                  className={reviewStatus === "approved" ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950" : ""}
                  onClick={() => setReviewStatus("approved")}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant={reviewStatus === "rejected" ? "destructive" : "outline"}
                  onClick={() => setReviewStatus("rejected")}
                >
                  Reject (Request Changes)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder={reviewStatus === "approved" ? "Great job! (Optional)" : "Please explain what needs to be improved..."}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReviewSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Mark this assignment as completed and provide feedback for the student.
            </p>
            <div className="space-y-2">
              <Label>Rating (1-5)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCompleteRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= completeRating ? "text-yellow-500" : "text-muted-foreground"
                    }`}
                  >
                    {star <= completeRating ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-feedback">Feedback (optional)</Label>
              <Textarea
                id="complete-feedback"
                value={completeFeedback}
                onChange={(e) => setCompleteFeedback(e.target.value)}
                placeholder="Share your thoughts about the student's work..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button onClick={handleCompleteProject} disabled={isCompleting}>
              {isCompleting ? "Completing..." : "Complete Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
