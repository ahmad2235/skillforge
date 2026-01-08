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
import type { ProjectAssignment } from "../../types/projects";

const STATUS_COLORS: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  invited: { variant: "outline" },
  accepted: { variant: "secondary", className: "bg-primary/15 text-primary border-primary/40" },
  completed: { variant: "default", className: "bg-emerald-500/20 text-emerald-100" },
  declined: { variant: "secondary" },
  removed: { variant: "destructive" },
};

export function BusinessProjectAssignmentsPage() {
  const { projectId } = useParams();
  const { toastSuccess, toastError } = useAppToast();
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Complete dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ProjectAssignment | null>(null);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [isCompleting, setIsCompleting] = useState(false);

  const loadAssignments = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/business/projects/${projectId}/assignments`
      );
      // Handle response structure { project: ..., assignments: [...] }
      const assignmentsData = response.data.assignments ?? response.data.data ?? response.data;
      
      if (Array.isArray(assignmentsData)) {
        setAssignments(assignmentsData as ProjectAssignment[]);
      } else {
        console.error("Unexpected assignments response format:", response.data);
        setAssignments([]);
      }
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ??
        "Failed to load assignments for this project.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, [projectId]);

  const openCompleteDialog = (assignment: ProjectAssignment) => {
    setSelectedAssignment(assignment);
    setFeedback("");
    setRating(5);
    setCompleteDialogOpen(true);
  };

  const handleComplete = async () => {
    if (!selectedAssignment) return;
    setIsCompleting(true);
    try {
      await apiClient.post(
        `/business/projects/assignments/${selectedAssignment.id}/complete`,
        {
          feedback: feedback || null,
          rating: rating,
        }
      );
      toastSuccess("Assignment marked as completed");
      setCompleteDialogOpen(false);
      setSelectedAssignment(null);
      loadAssignments();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to complete assignment";
      toastError(message);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">No project selected.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">Loading assignments...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="border-destructive bg-destructive/10 p-6">
          <p className="text-destructive text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  if (!assignments.length) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Project Assignments</h1>
            <p className="text-muted-foreground text-sm">Students working on this project</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/business/projects/${projectId}/candidates`}>
              <Button variant="outline" size="sm">Find candidates</Button>
            </Link>
            <Link to={`/business/projects/${projectId}`}>
              <Button variant="outline" size="sm">Back to project</Button>
            </Link>
          </div>
        </header>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">No assignments for this project yet.</p>
          <p className="text-muted-foreground text-xs mt-2">
            Invite students from the candidates page to get started.
          </p>
          <Link to={`/business/projects/${projectId}/candidates`} className="mt-4 inline-block">
            <Button>Find Candidates</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6 animate-page-enter">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Project Assignments</h1>
          <p className="text-muted-foreground text-sm">
            {assignments.length} student{assignments.length !== 1 ? "s" : ""} assigned to this project
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/business/projects/${projectId}/candidates`}>
            <Button variant="outline" size="sm">Find more candidates</Button>
          </Link>
          <Link to={`/business/projects/${projectId}`}>
            <Button variant="outline" size="sm">Back to project</Button>
          </Link>
        </div>
      </header>

      <div className="space-y-3">
        {assignments.map((assignment) => {
          const student = assignment.user;
          const statusStyle = STATUS_COLORS[assignment.status] || { variant: "outline" as const };
          const submissions = assignment.milestone_submissions || [];
          const approvedCount = submissions.filter(s => s.status === 'approved').length;

          return (
            <Card key={assignment.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-foreground">
                      {student?.name ?? `Student #${assignment.user_id}`}
                    </h2>
                    <Badge variant={statusStyle.variant} className={statusStyle.className}>
                      {assignment.status}
                    </Badge>
                  </div>
                  {student?.email && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {student.email}
                    </p>
                  )}

                  {/* Submission Progress */}
                  {assignment.status === 'accepted' && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-sm inline-block">
                       <span className="font-medium">Milestones:</span> {approvedCount} approved / {submissions.length} submitted
                    </div>
                  )}

                  {/* Feedback display */}
                  {assignment.status === 'completed' && (
                    <div className="mt-2 space-y-2">
                        {assignment.business_feedback && (
                        <div className="text-sm bg-emerald-500/10 p-2 rounded border border-emerald-500/30 text-emerald-100">
                          <span className="font-semibold text-emerald-100">Your Feedback:</span> {assignment.business_feedback} ({assignment.business_rating}/5)
                            </div>
                        )}
                        {assignment.student_feedback && (
                        <div className="text-sm bg-primary/10 p-2 rounded border border-primary/30 text-primary">
                          <span className="font-semibold">Student Feedback:</span> {assignment.student_feedback} ({assignment.student_rating}/5)
                            </div>
                        )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {assignment.status === "accepted" && (
                    <>
                      <Link to={`/business/projects/${projectId}/assignments/${assignment.id}/review`}>
                        <Button size="sm" variant="outline">
                          Review Submissions
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => openCompleteDialog(assignment)}
                        variant="default"
                      >
                        Complete Project
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>


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
              <Label htmlFor="rating">Rating (1-5)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= rating ? "text-yellow-500" : "text-muted-foreground"
                    }`}
                  >
                    {star <= rating ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (optional)</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
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
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "Completing..." : "Complete Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
