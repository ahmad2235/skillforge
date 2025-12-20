import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/feedback/EmptyState";
import { useAppToast } from "@/components/feedback/useAppToast";
import { isAxiosError } from "axios";
import { apiClient } from "../../lib/apiClient";

interface ApiSubmission {
  id: number | string;
  status?: string;
  answer_text?: string | null;
  attachment_url?: string | null;
  review_feedback?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: number | string | null;
  created_at?: string;
  updated_at?: string;
  user?: {
    id?: number | string;
    name?: string;
    email?: string;
  } | null;
  milestone?: {
    id?: number | string;
    title?: string;
  } | null;
  assignment?: {
    id?: number | string;
    project?: {
      id?: number | string;
      title?: string;
    } | null;
  } | null;
}

export default function AdminMilestoneSubmissionsPage() {
  const { toastSuccess, toastError } = useAppToast();
  const [submissions, setSubmissions] = useState<ApiSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ApiSubmission | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [actionId, setActionId] = useState<number | string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  // Add per-item processing state & errors
  const [processingIds, setProcessingIds] = useState<Record<number, boolean>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, string | null>>({});

  const formatError = (err: any) => {
    const message = err?.response?.data?.message || err?.message;
    return message ? `Something went wrong: ${message}` : "Something went wrong";
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.get("/admin/projects/milestone-submissions");
        const payload = res.data?.data ?? res.data ?? [];
        if (!active) return;
        setSubmissions(Array.isArray(payload) ? payload : []);
      } catch (err: any) {
        if (!active) return;
        const status = err?.status;
        if (status === 401 || status === 403) {
          setError("Not authorized");
        } else {
          setError(err?.message ?? "Unable to load submissions");
        }
        setSubmissions([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return submissions.filter((s) => {
      const projectTitle = s.assignment?.project?.title || "";
      const milestoneTitle = s.milestone?.title || "";
      const userName = s.user?.name || "";
      const email = s.user?.email || "";
      return (
        projectTitle.toLowerCase().includes(term) ||
        milestoneTitle.toLowerCase().includes(term) ||
        userName.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term)
      );
    });
  }, [submissions, search]);

  const handleSelect = (submission: ApiSubmission) => {
    setSelected(submission);
    setFeedbackDraft(submission.review_feedback || "");
  };

  const updateSubmissionState = (updated: ApiSubmission) => {
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
    setSelected((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const reviewSubmission = async (status: "approved" | "rejected") => {
    if (!selected?.id || isReviewing) return;
    if (status === "rejected") {
      const ok = window.confirm("Reject this submission?");
      if (!ok) return;
    }
    setIsReviewing(true);
    setActionId(selected.id);
    setReviewError(null);

    const optimistic = { ...selected, status, review_feedback: feedbackDraft };
    updateSubmissionState(optimistic);
    try {
      const res = await apiClient.post(`/admin/projects/milestone-submissions/${selected.id}/review`, {
        status,
        feedback: feedbackDraft || null,
      });
      const payload = res.data?.submission ?? optimistic;
      updateSubmissionState(payload);
      setReviewError(null);
      toastSuccess(status === "approved" ? "Approved" : "Rejected");
    } catch (err: any) {
      const statusCode = err?.status;
      const msg = formatError(err);
      if (statusCode === 401 || statusCode === 403) {
        setReviewError("Not authorized to perform this action.");
        toastError("Something went wrong: Not authorized");
      } else if (statusCode === 404 || statusCode === 405) {
        setReviewError("Endpoint not available");
        toastError("Something went wrong: Endpoint not available");
      } else if (statusCode === 422) {
        setReviewError(msg);
        toastError(msg);
      } else {
        setReviewError(msg);
        toastError(msg);
      }
      // revert optimistic change
      setSubmissions((prev) => prev.map((s) => (s.id === optimistic.id ? selected : s)));
      setSelected(selected);
    } finally {
      setIsReviewing(false);
      setActionId(null);
    }
  };

  const handleApprove = async (submissionId: number) => {
    if (processingIds[submissionId]) return;
    setProcessingIds((s) => ({ ...s, [submissionId]: true }));
    setItemErrors((s) => ({ ...s, [submissionId]: null }));
    try {
      await apiClient.post(`/admin/milestones/submissions/${submissionId}/approve`);
      // Optimistic update: mark submission as approved in local state
      setSubmissions((prev) => prev.map((it) => (it.id === submissionId ? { ...it, status: "approved" } : it)));
      // Optionally set a success message per item
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setItemErrors((s) => ({ ...s, [submissionId]: err.response?.data?.message ?? "Validation error." }));
      } else {
        setItemErrors((s) => ({ ...s, [submissionId]: isAxiosError(err) ? (err.response?.data?.message || "Action failed.") : "Action failed." }));
      }
    } finally {
      setProcessingIds((s) => ({ ...s, [submissionId]: false }));
    }
  };

  const statusBadge = (submission: ApiSubmission) => {
    const badge = getSubmissionStatusBadge(submission.status);
    return (
      <Badge variant={badge.variant} className={badge.className}>
        {badge.label}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Milestone submissions</h1>
          <p className="text-sm text-muted-foreground">Review and moderate project milestone submissions.</p>
        </header>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <div className="flex-1 min-w-[220px]">
              <Input
                placeholder="Search projects, milestones, or students"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.6fr_auto]"
                  >
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6">
                <EmptyState
                  title="Unable to load submissions"
                  description={error}
                  primaryActionLabel="Retry"
                  onPrimaryAction={() => window.location.reload()}
                />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No submissions"
                  description="New milestone submissions will appear here for review."
                  primaryActionLabel="Refresh"
                  onPrimaryAction={() => window.location.reload()}
                />
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((submission) => (
                  <div
                    key={submission.id}
                    className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.6fr_auto]"
                  >
                    <div>
                      <p className="font-medium text-foreground">{submission.assignment?.project?.title || "Untitled project"}</p>
                      <p className="text-sm text-muted-foreground">Milestone: {submission.milestone?.title || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{submission.user?.name || "Unknown student"}</p>
                      <p className="text-sm text-muted-foreground">{submission.user?.email || "—"}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Submitted: {submission.created_at || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Reviewed: {submission.reviewed_at || "—"}
                    </div>
                    <div>{statusBadge(submission)}</div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleSelect(submission)}>
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => setSelected(open ? selected : null)}>
        <SheetContent side="right" className="w-[460px] sm:w-[520px]">
          <SheetHeader>
            <SheetTitle>{selected?.assignment?.project?.title || "Submission"}</SheetTitle>
            <SheetDescription>
              {selected?.milestone?.title ? `Milestone: ${selected.milestone.title}` : "Milestone submission"}
            </SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="mt-4 space-y-6">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Student:</span> {selected.user?.name || "Unknown"} ({selected.user?.email || "—"})</p>
                <p><span className="font-medium text-foreground">Submitted:</span> {selected.created_at || "—"}</p>
                <p><span className="font-medium text-foreground">Status:</span> {getSubmissionStatusBadge(selected.status).label}</p>
                {selected.attachment_url ? (
                  <p>
                    <a className="text-primary underline" href={selected.attachment_url} target="_blank" rel="noreferrer">
                      View attachment
                    </a>
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Answer</p>
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  {selected.answer_text || "No answer provided"}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Feedback (optional)</p>
                <Textarea
                  value={feedbackDraft}
                  onChange={(e) => setFeedbackDraft(e.target.value)}
                  placeholder="Add review feedback for the student"
                  rows={4}
                  disabled={isReviewing}
                />
                {reviewError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {reviewError}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => reviewSubmission("approved")}
                  disabled={isReviewing}
                  aria-busy={isReviewing && actionId === selected.id}
                >
                  {isReviewing && actionId === selected.id ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Approving...
                    </span>
                  ) : (
                    "Approve"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => reviewSubmission("rejected")}
                  disabled={isReviewing}
                  aria-busy={isReviewing && actionId === selected.id}
                >
                  {isReviewing && actionId === selected.id ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rejecting...
                    </span>
                  ) : (
                    "Reject"
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
