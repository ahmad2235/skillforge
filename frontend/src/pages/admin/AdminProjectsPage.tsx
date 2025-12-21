import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/feedback/EmptyState";
import { useAppToast } from "@/components/feedback/useAppToast";
import { apiClient } from "@/lib/apiClient";
import { getProjectStatusBadge } from "@/lib/statusBadges";

type ApiProject = {
  id: number | string;
  title?: string;
  owner?: string;
  owner_name?: string;
  status?: string;
  domain?: string;
  required_level?: string;
  level?: string;
  created_at?: string;
  createdAt?: string;
  admin_note?: string | null;
  summary?: string;
  milestones?: string[];
};

type ApiMeta = {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

const normalize = (value?: string | null) => (value || "").toLowerCase().replace(/\s+/g, "_");

export default function AdminProjectsPage() {
  const { toastSuccess, toastError } = useAppToast();

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionProjectId, setActionProjectId] = useState<number | string | null>(null);

  const formatError = (err: any) => {
    const message = err?.response?.data?.message || err?.message;
    return message ? `Something went wrong: ${message}` : "Something went wrong";
  };

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      setIsLoading(true);
      setUnauthorized(false);
      setError(null);

      try {
        const res = await apiClient.get("/admin/projects", { params: { page } });
        const payload = res.data?.data ?? res.data ?? [];
        const metaPayload: ApiMeta | null = res.data?.meta ?? null;

        if (!active) return;
        setProjects(Array.isArray(payload) ? payload : []);
        setMeta(metaPayload && metaPayload.current_page ? metaPayload : null);
      } catch (err: any) {
        if (!active) return;
        const status = err?.status ?? err?.response?.status;
        if (status === 401 || status === 403) {
          setUnauthorized(true);
        } else {
          setError(err?.message ?? "Unable to load projects");
        }
        setProjects([]);
        setMeta(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, [page]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = (project.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (project.owner || project.owner_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || normalize(project.status) === statusFilter;
      const matchesDomain = domainFilter === "all" || normalize(project.domain) === domainFilter;
      return matchesSearch && matchesStatus && matchesDomain;
    });
  }, [domainFilter, projects, search, statusFilter]);

  const hasProjects = filteredProjects.length > 0;
  const showPagination = meta?.current_page && meta?.last_page && meta.last_page > 1;

  const handleView = (project: ApiProject) => {
    setSelectedProject(project);
    setAdminNoteDraft(project.admin_note || "");

    if (!project.id) return;
    setIsDetailLoading(true);
    apiClient
      .get(`/admin/projects/${project.id}`)
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        if (payload) {
          setSelectedProject(payload);
          setAdminNoteDraft(payload.admin_note || "");
        }
      })
      .catch(() => {
        // keep list data on error
      })
      .finally(() => setIsDetailLoading(false));
  };

  const getValidationMessage = (err: any) => {
    const errors = err?.errors;
    if (errors && typeof errors === "object") {
      const firstKey = Object.keys(errors)[0];
      const firstValue = firstKey ? errors[firstKey] : null;
      if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
        return firstValue[0];
      }
      if (typeof firstValue === "string") {
        return firstValue;
      }
    }
    return null;
  };

  const updateProjectState = (updated: ApiProject) => {
    setProjects((prev) => prev.map((project) => (project.id === updated.id ? { ...project, ...updated } : project)));
    setSelectedProject((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const handleApprove = async (project?: ApiProject) => {
    const target = project ?? selectedProject;
    if (!target?.id || isApproving || isCancelling) return;
    setIsApproving(true);
    setActionProjectId(target.id);
    try {
      const res = await apiClient.put(`/admin/projects/${target.id}`, { status: "open" });
      const updated = res.data?.data ?? { ...target, status: "open" };
      updateProjectState(updated);
      toastSuccess("Approved");
    } catch (err: any) {
      const status = err?.status;
      if (status === 401 || status === 403) {
        toastError("Something went wrong: Not authorized");
      } else if (status === 404 || status === 405) {
        toastError("Something went wrong: Endpoint not available");
      } else if (status === 422) {
        const detail = getValidationMessage(err);
        toastError(detail ? `Something went wrong: ${detail}` : "Something went wrong");
      } else {
        toastError(formatError(err));
      }
    } finally {
      setIsApproving(false);
      setActionProjectId(null);
    }
  };

  const handleCancel = async (project?: ApiProject) => {
    const target = project ?? selectedProject;
    if (!target?.id || isApproving || isCancelling) return;
    const confirmed = window.confirm("Cancel this project? This cannot be undone.");
    if (!confirmed) return;
    setIsCancelling(true);
    setActionProjectId(target.id);
    try {
      const res = await apiClient.put(`/admin/projects/${target.id}`, { status: "cancelled" });
      const updated = res.data?.data ?? { ...target, status: "cancelled" };
      updateProjectState(updated);
      toastSuccess("Updated");
    } catch (err: any) {
      const status = err?.status;
      if (status === 401 || status === 403) {
        toastError("Something went wrong: Not authorized");
      } else if (status === 404 || status === 405) {
        toastError("Something went wrong: Endpoint not available");
      } else if (status === 422) {
        const detail = getValidationMessage(err);
        toastError(detail ? `Something went wrong: ${detail}` : "Something went wrong");
      } else {
        toastError(formatError(err));
      }
    } finally {
      setIsCancelling(false);
      setActionProjectId(null);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedProject?.id || isSavingNote) return;
    const noteBaseline = selectedProject.admin_note || "";
    if (adminNoteDraft === noteBaseline) return;
    setIsSavingNote(true);
    try {
      const res = await apiClient.put(`/admin/projects/${selectedProject.id}`, { admin_note: adminNoteDraft });
      const updated = res.data?.data ?? { ...selectedProject, admin_note: adminNoteDraft };
      updateProjectState(updated);
      setAdminNoteDraft(updated.admin_note ?? "");
      toastSuccess("Saved");
    } catch (err: any) {
      const status = err?.status;
      if (status === 401 || status === 403) {
        toastError("Something went wrong: Not authorized");
      } else if (status === 404 || status === 405) {
        toastError("Something went wrong: Endpoint not available");
      } else if (status === 422) {
        const detail = getValidationMessage(err);
        toastError(detail ? `Something went wrong: ${detail}` : "Something went wrong");
      } else {
        toastError(formatError(err));
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleExport = () => {
    // noop — coming soon
  };

  const handleRefresh = () => {
    setPage(1);
  };

  const noteBaseline = selectedProject?.admin_note || "";
  const isNoteDirty = adminNoteDraft !== noteBaseline;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">Oversight, moderation, and administrative actions.</p>
      </header>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <div className="flex-1 min-w-[220px]">
              <Input
                placeholder="Search projects or owners"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="fullstack">Fullstack</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button disabled className="opacity-60">Export (coming soon)</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All projects</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_0.7fr_auto]"
                  >
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                ))}
              </div>
            ) : unauthorized ? (
              <div className="p-6">
                <EmptyState
                  title="Not authorized"
                  description="Please log in with an admin account to view projects."
                  primaryActionLabel="Go to login"
                  onPrimaryAction={() => (window.location.href = "/login")}
                />
              </div>
            ) : error ? (
              <div className="p-6">
                <EmptyState
                  title="Unable to load projects"
                  description={error}
                  primaryActionLabel="Retry"
                  onPrimaryAction={handleRefresh}
                />
              </div>
            ) : !hasProjects ? (
              <div className="p-6">
                <EmptyState
                  title="No projects"
                  description="Projects will appear here once businesses create them."
                  primaryActionLabel="Refresh"
                  onPrimaryAction={handleRefresh}
                />
              </div>
            ) : (
              <div className="divide-y">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_0.7fr_auto]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{project.title}</p>
                        {project.admin_note ? (
                          <span className="text-xs text-primary" title="Admin note exists">●</span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Owner: {project.owner || project.owner_name || "—"}
                      </p>
                    </div>
                    <div>
                      <Badge variant="secondary">{project.domain || "—"}</Badge>
                    </div>
                    <div>
                      {(() => {
                        const badge = getProjectStatusBadge(project.status);
                        return (
                          <Badge variant={badge.variant} className={badge.className}>
                            {badge.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">{project.required_level || project.level || "—"}</div>
                    <div className="text-sm text-muted-foreground">{project.createdAt || project.created_at || "—"}</div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleView(project)}>
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApprove(project)}
                        disabled={isApproving || isCancelling}
                        aria-busy={isApproving && actionProjectId === project.id}
                      >
                        {isApproving && actionProjectId === project.id ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Approving...
                          </span>
                        ) : (
                          "Approve"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(project)}
                        disabled={isApproving || isCancelling}
                        aria-busy={isCancelling && actionProjectId === project.id}
                      >
                        {isCancelling && actionProjectId === project.id ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cancelling...
                          </span>
                        ) : (
                          "Cancel"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {showPagination ? (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {meta?.current_page} of {meta?.last_page}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(meta?.current_page || 1) <= 1}
                  onClick={() => setPage(Math.max((meta?.current_page || 1) - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(meta?.current_page || 1) >= (meta?.last_page || 1)}
                  onClick={() => setPage(Math.min((meta?.current_page || 1) + 1, meta?.last_page || 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

      <Sheet open={!!selectedProject} onOpenChange={(open) => setSelectedProject(open ? selectedProject : null)}>
        <SheetContent side="right" className="w-[460px] sm:w-[520px]">
          <SheetHeader>
            <SheetTitle>{selectedProject?.title}</SheetTitle>
            <SheetDescription>Owner: {selectedProject?.owner || selectedProject?.owner_name}</SheetDescription>
          </SheetHeader>

          {selectedProject ? (
            <div className="mt-4 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Summary</p>
                <p className="text-sm text-muted-foreground">{selectedProject.summary || "—"}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{selectedProject.domain || "—"}</Badge>
                  {(() => {
                    const badge = getProjectStatusBadge(selectedProject.status);
                    return (
                      <Badge variant={badge.variant} className={badge.className}>
                        {badge.label}
                      </Badge>
                    );
                  })()}
                  <span className="rounded-md border px-2 py-1">Level: {selectedProject.required_level || selectedProject.level || "—"}</span>
                  <span className="rounded-md border px-2 py-1">Created: {selectedProject.createdAt || selectedProject.created_at || "—"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Milestones overview</p>
                <div className="space-y-2 rounded-lg border p-3 text-sm text-muted-foreground">
                  {(selectedProject.milestones && selectedProject.milestones.length > 0
                    ? selectedProject.milestones
                    : ["Milestones not provided"]
                  ).map((m) => (
                    <div key={m} className="flex items-start gap-2">
                      <span className="mt-1 text-xs text-primary">•</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Admin note</p>
                <Textarea
                  value={adminNoteDraft}
                  onChange={(e) => setAdminNoteDraft(e.target.value)}
                  placeholder="Add internal notes for this project"
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={!isNoteDirty || isSavingNote}
                    aria-busy={isSavingNote}
                  >
                    {isSavingNote ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save note"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-semibold">Actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove()}
                    disabled={isApproving || isCancelling}
                    aria-busy={isApproving && actionProjectId === selectedProject?.id}
                  >
                    {isApproving && actionProjectId === selectedProject?.id ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Approving...
                      </span>
                    ) : (
                      "Approve project"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCancel()}
                    disabled={isApproving || isCancelling}
                    aria-busy={isCancelling && actionProjectId === selectedProject?.id}
                  >
                    {isCancelling && actionProjectId === selectedProject?.id ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cancelling...
                      </span>
                    ) : (
                      "Cancel project"
                    )}
                  </Button>
                </div>
              </div>

              {isDetailLoading ? (
                <p className="text-xs text-muted-foreground">Loading project details...</p>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
