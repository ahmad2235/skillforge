import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/apiClient";
import ErrorStateCard from "@/components/shared/ErrorStateCard";
import { parseApiError, isNotImplemented } from "@/lib/apiErrors";
import EmptyState from "@/components/feedback/EmptyState";
import { useAppToast } from "@/components/feedback/useAppToast";
import { getSubmissionStatusBadge } from "@/lib/statusBadges";

type ApiUser = { id?: number | string; name?: string; email?: string };
type ApiTask = { id?: number | string; title?: string; description?: string; rubric?: any[]; max_score?: number };
type ApiAiEvaluation = { id?: number | string; provider?: string; model?: string; status?: string; score?: number; feedback?: string; rubric_scores?: any[]; completed_at?: string };

type ApiSubmissionListItem = {
  id: number | string;
  task_title?: string;
  user_name?: string;
  user_email?: string;
  status?: string;
  score?: number | null;
  final_score?: number | null;
  evaluated_by?: string | null;
  latest_ai_evaluation_id?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ApiSubmissionDetail = {
  id: number | string;
  task_id?: number | string;
  answer_text?: string | null;
  attachment_url?: string | null;
  status?: string | null;
  score?: number | null;
  final_score?: number | null;
  rubric_scores?: any[] | null;
  feedback?: string | null;
  evaluated_by?: string | null;
  effective_score?: number | null;
  task?: ApiTask | null;
  user?: ApiUser | null;
  latest_ai_evaluation?: ApiAiEvaluation | null;
};

export default function AdminLearningSubmissionsPage() {
  const { toastSuccess, toastError } = useAppToast();
  const [items, setItems] = useState<ApiSubmissionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");

  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [selected, setSelected] = useState<ApiSubmissionDetail | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use admin monitoring recent endpoint for list
      const res = await apiClient.get("/admin/monitoring/submissions/recent?limit=50");
      const payload = res.data?.data ?? res.data ?? [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch (err: unknown) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((it) => statusFilter === "all" || it.status === statusFilter)
      .filter((it) => {
        if (!term) return true;
        return (
          String(it.id).toLowerCase().includes(term) ||
          (it.task_title || "").toLowerCase().includes(term) ||
          (it.user_name || "").toLowerCase().includes(term) ||
          (it.user_email || "").toLowerCase().includes(term)
        );
      });
  }, [items, search, statusFilter]);

  const openDetail = async (id: number | string) => {
    setSelectedId(id);
    setSelected(null);
    setFieldErrors({});
    try {
      const res = await apiClient.get(`/admin/learning/submissions/${id}`);
      const payload = res.data?.data ?? res.data ?? null;
      setSelected(payload);
    } catch (err: unknown) {
      setSelected(null);
      setFieldErrors({});
      setError(err);
    }
  };

  const saveOverride = async (payload: { status: string; final_score?: number | null; feedback?: string | null; rubric_scores?: any[] | null }) => {
    if (!selected) return;
    setIsProcessing(true);
    setFieldErrors({});
    try {
      const res = await apiClient.post(`/admin/learning/submissions/${selected.id}/review`, payload);
      const updated = res.data?.data ?? res.data ?? null;
      // Update list and detail with returned submission
      if (updated) {
        setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)));
        setSelected(updated);
      }
      toastSuccess("Saved override");
    } catch (err: any) {
      const parsed = parseApiError(err);
      if (parsed.kind === "validation" && err?.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      } else if (isNotImplemented(err)) {
        setError(err);
      } else if (parsed.kind === "unauthorized" || parsed.kind === 'forbidden') {
        setError(err);
      } else {
        toastError(parsed.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading submissions...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Fetching recent submissions</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const parsed = parseApiError(error);
    if (isNotImplemented(error)) {
      return (
        <div className="mx-auto max-w-5xl p-6">
          <ErrorStateCard comingSoon={true} comingSoonTitle="Submissions Coming Soon" comingSoonDescription="Submission review is not yet implemented." primaryActionLabel="Refresh" onPrimaryAction={fetchList} />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-5xl p-6">
        <ErrorStateCard error={error as any} onRetry={fetchList} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Submissions</h1>
        <p className="text-sm text-muted-foreground">Review and override student task submissions.</p>
      </header>

      <Card>
        <CardContent className="flex gap-3 p-4 sm:p-5">
          <div className="flex-1">
            <Input placeholder="Search by id, student or task" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ minWidth: 160 }}>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="evaluating">Evaluating</SelectItem>
                <SelectItem value="evaluated">Evaluated</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No submissions" description="No submissions match your filters." primaryActionLabel="Refresh" onPrimaryAction={fetchList} />
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((s) => (
                  <div key={s.id} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[0.8fr_1fr_0.8fr_0.8fr_0.6fr_auto]">
                    <div>
                      <p className="font-medium text-foreground">#{s.id} — {s.task_title}</p>
                      <p className="text-sm text-muted-foreground">{s.user_name} ({s.user_email})</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{s.status || '—'}</div>
                    <div className="text-sm text-muted-foreground">{s.final_score ?? s.score ?? '—'}</div>
                    <div className="text-sm text-muted-foreground">{s.evaluated_by ?? '—'}</div>
                    <div className="text-sm text-muted-foreground">{s.updated_at ?? s.created_at ?? ''}</div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => openDetail(s.id)}>Review</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Sheet open={!!selected} onOpenChange={(open) => { if (!open) { setSelectedId(null); setSelected(null); } }}>
          <SheetContent side="right" className="w-[560px] sm:w-[640px]">
            <SheetHeader>
              <SheetTitle>Review submission</SheetTitle>
              <SheetDescription>Review and override the submission snapshot. AI evaluation history is read-only.</SheetDescription>
            </SheetHeader>

            {selected ? (
              <div className="mt-4 space-y-4 p-4">
                <div className="space-y-1">
                  <p className="font-semibold">Task</p>
                  <p className="text-sm text-muted-foreground">{selected.task?.title}</p>
                  <p className="text-sm">{selected.task?.description}</p>
                  {selected.task?.rubric && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-medium">Rubric</p>
                      {selected.task.rubric.map((r: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          <p className="text-sm">{r.criterion} ({r.max_points})</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium">Student</p>
                  <p className="text-sm text-muted-foreground">{selected.user?.name} ({selected.user?.email})</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Answer</p>
                  <div className="rounded-lg border p-3 text-sm text-muted-foreground">{selected.answer_text || 'No answer provided'}</div>
                  {selected.attachment_url && <p className="mt-2"><a className="text-primary underline" href={selected.attachment_url} target="_blank" rel="noreferrer">View attachment</a></p>}
                </div>

                <div>
                  <p className="text-sm font-medium">Current snapshot</p>
                  <p>Status: {getSubmissionStatusBadge(selected.status).label}</p>
                  <p>Effective score: {selected.effective_score ?? '—'}</p>
                  <p>Feedback: {selected.feedback ?? '—'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Latest AI evaluation (read-only)</p>
                  {selected.latest_ai_evaluation ? (
                    <div className="rounded-lg border p-3 space-y-1 text-sm">
                      <p>Provider: {selected.latest_ai_evaluation.provider} / {selected.latest_ai_evaluation.model}</p>
                      <p>Status: {selected.latest_ai_evaluation.status}</p>
                      <p>Score: {selected.latest_ai_evaluation.score}</p>
                      <p>Feedback: {selected.latest_ai_evaluation.feedback}</p>
                      <p>Completed: {selected.latest_ai_evaluation.completed_at}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No AI evaluation yet</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Override submission</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <Select value={selected.status ?? 'evaluated'} onValueChange={(v) => setSelected((s) => s ? { ...s, status: v } : s)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="evaluated">Evaluated</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end justify-end col-span-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          const res = await apiClient.post(`/admin/learning/submissions/${selected.id}/re-evaluate`);
                          toastSuccess('Evaluation queued');
                          // refresh detail
                          const fresh = await apiClient.get(`/admin/learning/submissions/${selected.id}`);
                          setSelected(fresh.data?.data ?? fresh.data ?? null);
                        } catch (err: any) {
                          toastError('Failed to queue evaluation');
                        }
                      }}>
                        Re-evaluate
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Final score</label>
                  <Input type="number" value={selected.final_score ?? ''} onChange={(e) => setSelected((s) => s ? { ...s, final_score: e.target.value ? Number(e.target.value) : null } : s)} min={0} max={selected.task?.max_score ?? 100} step="0.1" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Feedback</label>
                  <Textarea value={selected.feedback ?? ''} onChange={(e) => setSelected((s) => s ? { ...s, feedback: e.target.value } : s)} rows={4} />
                </div>

                {selected.task?.rubric && selected.task.rubric.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Rubric scores</p>
                    <div className="space-y-2">
                      {selected.task.rubric.map((r: any, idx: number) => {
                        const current = (selected.rubric_scores && selected.rubric_scores[idx]?.score) ?? 0;
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="flex-1">{r.criterion} ({r.max_points})</div>
                            <div style={{ width: 120 }}>
                              <Input type="number" min={0} max={r.max_points} step="0.1" value={(selected.rubric_scores?.[idx]?.score ?? current).toString()} onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : 0;
                                const copy = selected.rubric_scores ? [...selected.rubric_scores] : (selected.task?.rubric ?? []).map((c: any) => ({ criterion: c.criterion, score: 0, max_points: c.max_points }));
                                copy[idx] = { criterion: r.criterion, score: val, max_points: r.max_points };
                                setSelected((s) => s ? { ...s, rubric_scores: copy } : s);
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button onClick={() => saveOverride({ status: selected.status ?? 'evaluated', final_score: selected.final_score ?? null, feedback: selected.feedback ?? null, rubric_scores: selected.rubric_scores ?? null })} disabled={isProcessing}>{isProcessing ? 'Saving...' : 'Save override'}</Button>
                  <Button variant="secondary" onClick={() => { setSelected(null); setSelectedId(null); }}>Close</Button>
                </div>

                {Object.keys(fieldErrors).length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <p className="font-semibold">Validation errors</p>
                    <ul>
                      {Object.entries(fieldErrors).map(([k, v]) => (<li key={k}><strong>{k}:</strong> {v.join(', ')}</li>))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState title="Select a submission" description="Choose a submission from the list to review it." primaryActionLabel="Refresh" onPrimaryAction={fetchList} />
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
