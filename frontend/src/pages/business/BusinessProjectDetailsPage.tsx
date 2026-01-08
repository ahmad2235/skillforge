import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/feedback/EmptyState";
import { SkeletonList } from "../../components/feedback/Skeletons";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
// Using Dialog for confirmations instead of a separate AlertDialog component
// (alert-dialog component was not present in the repo)

import { useAppToast } from "../../components/feedback/useAppToast";
import { apiClient } from "../../lib/apiClient";
import { getMilestoneStatusBadge, getProjectStatusBadge } from "../../lib/statusBadges";

type Project = {
  id: number;
  title: string;
  domain?: string;
  level?: string;
  status?: string;
  description?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  required_level?: string;
  estimated_duration_weeks?: number | string;
  duration?: string;
  milestones?: Milestone[];
};

type Milestone = {
  id: number;
  title: string;
  status?: string;
  due_date?: string;
  due?: string;
  hint?: string;
  description?: string;
  is_required?: boolean;
  order_index?: number;
};

const activity = [
  { title: "Milestone submitted", badge: "Review" },
  { title: "Review completed", badge: "Done" },
  { title: "Candidate invited", badge: "New" },
];

const formatDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

export const BusinessProjectDetailsPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const { toastSuccess, toastError } = useAppToast();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isChangingStatus, setIsChangingStatus] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState<boolean>(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    domain: "",
    required_level: "",
    complexity: "low",
    estimated_duration_weeks: "",
  });
  const [requirementsPdfUpdate, setRequirementsPdfUpdate] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Add milestone dialog state
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState<boolean>(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    due_date: "",
    is_required: true,
  });
  const [milestoneFormErrors, setMilestoneFormErrors] = useState<Record<string, string>>({});
  const [isCreatingMilestone, setIsCreatingMilestone] = useState<boolean>(false);

  // Milestone details dialog state
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isMilestoneDetailsOpen, setIsMilestoneDetailsOpen] = useState<boolean>(false);

  const formatError = (err: any) => {
    const message = err?.response?.data?.message || err?.message;
    return message ? `Something went wrong: ${message}` : "Something went wrong";
  };

  const loadProject = async () => {
    if (!projectId) return;

    setIsLoading(true);
    setNotFound(false);
    setUnauthorized(false);
    setError(null);

    try {
      const projectRes = await apiClient.get(`/business/projects/${projectId}`);
      const projectPayload = (projectRes.data?.data ?? projectRes.data) as Project;
      setProject(projectPayload);

      try {
        const milestonesRes = await apiClient.get(`/business/projects/${projectId}/milestones`);
        const milestonePayload = (milestonesRes.data?.data ?? milestonesRes.data ?? []) as Milestone[];
        const milestonesWithStatus = (Array.isArray(milestonePayload) ? milestonePayload : []).map(m => ({
          ...m,
          status: m.status || "not_started"
        }));
        setMilestones(milestonesWithStatus);
      } catch (milestoneErr: any) {
        const fallback = Array.isArray(projectPayload?.milestones) ? projectPayload.milestones.map(m => ({
          ...m,
          status: m.status || "not_started"
        })) : [];
        setMilestones(fallback);

        if (milestoneErr?.status === 401) {
          setUnauthorized(true);
        } else if (milestoneErr?.status && milestoneErr.status !== 404) {
          setError(milestoneErr?.message ?? "Unable to load milestones");
        }
      }
    } catch (err: any) {
      if (err?.status === 404) {
        setNotFound(true);
      } else if (err?.status === 401) {
        setUnauthorized(true);
      } else {
        setError(err?.message ?? "Unable to load project");
      }
      setProject(null);
      setMilestones([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const openEditWithProject = () => {
    if (!project) return;
    setForm({
      title: project.title || "",
      description: project.description || "",
      domain: project.domain || "",
      required_level: project.required_level || project.level || "",
      complexity: (project as any).complexity || "low",
      estimated_duration_weeks: project.estimated_duration_weeks?.toString() || "",
    });
    setRequirementsPdfUpdate(null);
    setFormErrors({});
    setIsEditOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!form.description.trim()) errors.description = "Description is required";
    if (!form.domain) errors.domain = "Domain is required";
    if (!form.required_level) errors.required_level = "Level is required";
    if (form.estimated_duration_weeks) {
      const num = Number(form.estimated_duration_weeks);
      if (Number.isNaN(num) || num < 1) errors.estimated_duration_weeks = "Must be at least 1 week";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!project || !validateForm()) return;

    setIsSaving(true);
    setFormErrors({});
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      if (form.domain) formData.append("domain", form.domain);
      if (form.required_level) formData.append("required_level", form.required_level);
      if (form.complexity) formData.append("complexity", form.complexity);
      if (form.estimated_duration_weeks) {
        formData.append("estimated_duration_weeks", String(Number(form.estimated_duration_weeks)));
      }
      if (requirementsPdfUpdate) {
        formData.append("requirements_pdf", requirementsPdfUpdate);
      }

      await apiClient.put(`/business/projects/${project.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toastSuccess("Updated");
      setIsEditOpen(false);
      loadProject();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 401) {
        setUnauthorized(true);
        setIsEditOpen(false);
      } else if (status === 422) {
        const errors = err?.response?.data?.errors || {};
        const mapped: Record<string, string> = {};
        Object.keys(errors).forEach((key) => {
          mapped[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
        });
        setFormErrors(mapped);
      } else {
        toastError(formatError(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/business/projects/${project.id}`);
      toastSuccess("Deleted");
      navigate("/business/projects");
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 401) {
        setUnauthorized(true);
      } else {
        toastError(formatError(err));
      }
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!project) return;
    setIsChangingStatus(true);
    try {
      await apiClient.post(`/business/projects/${project.id}/status`, {
        status: newStatus,
      });
      toastSuccess(`Project status changed to ${newStatus}`);
      setStatusConfirmOpen(false);
      setPendingStatus(null);
      loadProject();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 401) {
        setUnauthorized(true);
      } else {
        toastError(formatError(err));
      }
    } finally {
      setIsChangingStatus(false);
    }
  };

  const openStatusConfirm = (status: string) => {
    setPendingStatus(status);
    setStatusConfirmOpen(true);
  };

  const handleAddMilestone = async (e: FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setIsCreatingMilestone(true);
    setMilestoneFormErrors({});

    try {
      await apiClient.post(`/business/projects/${project.id}/milestones`, {
        title: milestoneForm.title,
        description: milestoneForm.description || undefined,
        due_date: milestoneForm.due_date || undefined,
        is_required: milestoneForm.is_required,
      });

      toastSuccess("Milestone added successfully");
      setIsAddMilestoneOpen(false);
      setMilestoneForm({
        title: "",
        description: "",
        due_date: "",
        is_required: true,
      });
      loadProject();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 401) {
        setUnauthorized(true);
        setIsAddMilestoneOpen(false);
      } else if (status === 422) {
        const errors = err?.response?.data?.errors || {};
        const mapped: Record<string, string> = {};
        Object.keys(errors).forEach((key) => {
          mapped[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
        });
        setMilestoneFormErrors(mapped);
      } else {
        toastError(formatError(err));
      }
    } finally {
      setIsCreatingMilestone(false);
    }
  };

  const getNextStatusActions = () => {
    const currentStatus = project?.status?.toLowerCase();
    const actions: { label: string; status: string; variant: "default" | "outline" | "destructive" }[] = [];
    
    if (currentStatus === "draft") {
      actions.push({ label: "Publish Project", status: "open", variant: "default" });
    } else if (currentStatus === "open") {
      actions.push({ label: "Start Work", status: "in_progress", variant: "default" });
      actions.push({ label: "Cancel Project", status: "cancelled", variant: "destructive" });
    } else if (currentStatus === "in_progress") {
      actions.push({ label: "Mark Completed", status: "completed", variant: "default" });
      actions.push({ label: "Cancel Project", status: "cancelled", variant: "destructive" });
    }
    
    return actions;
  };

  const hasMilestones = useMemo(() => milestones.length > 0, [milestones]);

  // Project theming - compute HSL tokens based on domain or project metadata
  const projectTheme = useMemo(() => {
    if (!project) return null;

    // Allow explicit theme via project.metadata.theme_hsl (e.g., "199 89% 60%")
    const explicit = (project as any)?.metadata?.theme_hsl;
    if (explicit) {
      return {
        accent: explicit,
        accentForeground: "210 40% 98%",
        brand: explicit,
      };
    }

    // Fallback mapping by domain
    const domain = (project.domain || "").toLowerCase();
    const palette: Record<string, { accent: string; accentForeground: string; brand: string }> = {
      frontend: { accent: "199 89% 60%", accentForeground: "222 47% 11%", brand: "199 89% 60%" }, // sky
      backend: { accent: "267 60% 50%", accentForeground: "222 47% 11%", brand: "267 60% 50%" }, // purple
      default: { accent: "200 80% 40%", accentForeground: "210 40% 98%", brand: "200 80% 40%" },
    };

    return palette[domain] ?? palette.default;
  }, [project]);

  const themeStyle = useMemo(() => {
    if (!projectTheme) return undefined;
    // Using CSS variables; cast to any for TS compatibility
    return {
      ['--accent' as any]: projectTheme.accent,
      ['--accent-foreground' as any]: projectTheme.accentForeground,
      ['--brand' as any]: projectTheme.brand,
    } as React.CSSProperties;
  }, [projectTheme]);

  const cardStyle = useMemo(() => {
    if (!projectTheme) return undefined;
    return {
      borderColor: `hsl(${projectTheme.accent} / 14%)`,
      backgroundColor: 'hsl(var(--card))',
    } as React.CSSProperties;
  }, [projectTheme]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <SkeletonList rows={6} />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <EmptyState
        title="Login required"
        description="Please log in to view this project."
        primaryActionLabel="Go to login"
        onPrimaryAction={() => navigate("/login")}
      />
    );
  }

  if (notFound || !project) {
    return (
      <EmptyState
        title="Project not found"
        description="We couldn't find this project."
        primaryActionLabel="Back to projects"
        onPrimaryAction={() => navigate("/business/projects")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 animate-page-enter" style={themeStyle}>
      {project.status === 'completed' && (
        <div className="w-full rounded-lg p-4 flex items-center justify-between animate-card-enter shadow-lg" style={{ backgroundColor: projectTheme ? `hsl(${projectTheme.accent} / 14%)` : undefined, border: projectTheme ? `1px solid hsl(${projectTheme.accent} / 18%)` : undefined }}>
            <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: projectTheme ? `hsl(${projectTheme.accent} / 20%)` : undefined, color: projectTheme ? `hsl(${projectTheme.accentForeground})` : undefined }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
              <h3 className="text-lg font-semibold text-foreground">Project Completed</h3>
              <p className="text-sm text-muted-foreground">This project has been successfully completed on {formatDate(project.updated_at || new Date().toISOString())}.</p>
                </div>
            </div>
          <Button className="hover:bg-opacity-90" style={{ backgroundColor: projectTheme ? `hsl(${projectTheme.accent})` : undefined, color: projectTheme ? `hsl(${projectTheme.accentForeground})` : undefined, borderColor: projectTheme ? `hsl(${projectTheme.accent} / 22%)` : undefined }} onClick={() => navigate(`/business/projects/${project.id}/assignments`)}>
                View Final Results
            </Button>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2 w-14 rounded" style={{ backgroundColor: projectTheme ? `hsl(${projectTheme.accent})` : undefined }} />
            <h1 className="text-3xl font-semibold" style={{ color: projectTheme ? `hsl(${projectTheme.accentForeground})` : undefined }}>{project.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">
              {project.domain}
            </Badge>
            <span className="text-muted-foreground">• Level: {project.level}</span>
            {(() => {
              const badge = getProjectStatusBadge(project.status);
              return (
                <Badge variant={badge.variant} className={badge.className}>
                  {badge.label}
                </Badge>
              );
            })()}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.status !== 'completed' && getNextStatusActions().map((action) => (
            <Button
              key={action.status}
              variant={action.variant}
              onClick={() => openStatusConfirm(action.status)}
            >
              {action.label}
            </Button>
          ))}
          
          {project.status !== 'completed' && (
            <Button
              onClick={() => {
                navigate(`/business/projects/${project.id}/candidates`, {
                  state: { projectTitle: project.title },
                });
              }}
            >
              View candidates
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => {
              navigate(`/business/projects/${project.id}/assignments`);
            }}
          >
            View assignments
          </Button>
          
          {project.status !== 'completed' && (
            <>
              <Button
                variant="outline"
                onClick={openEditWithProject}
              >
                Edit project
              </Button>
              <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </header>

      {error ? (
        <EmptyState
          title="Unable to load"
          description={error}
          primaryActionLabel="Back to projects"
          onPrimaryAction={() => navigate("/business/projects")}
        />
      ) : (
        <>
          <Card className="space-y-3 border p-4 shadow-sm" style={cardStyle}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Summary</h2>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="text-muted-foreground">Created: {formatDate(project.created_at ?? project.createdAt)}</span>
              {project.duration && <span className="text-muted-foreground">Duration: {project.duration}</span>}
              <span className="text-muted-foreground">ID: {project.id}</span>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Milestones</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMilestoneOpen(true)}
                >
                  Add milestone
                </Button>
              </div>

              {hasMilestones ? (
                <div className="space-y-3">
                  {milestones.map((m) => {
                    const badge = getMilestoneStatusBadge(m.status);
                    return (
                      <Card key={m.id} className="space-y-3 border p-4 shadow-sm" style={cardStyle}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">{m.title}</p>
                            <p className="text-xs text-muted-foreground">Due {formatDate(m.due_date ?? m.due)}</p>
                          </div>
                          <Badge variant={badge.variant} className={badge.className}>
                            {badge.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{m.hint || m.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedMilestone(m);
                              setIsMilestoneDetailsOpen(true);
                            }}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: request re-evaluation action
                            }}
                          >
                            Request re-evaluation
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No milestones yet"
                  description="Add milestones to track progress clearly."
                  primaryActionLabel="Add milestone"
                  onPrimaryAction={() => setIsAddMilestoneOpen(true)}
                />
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
              <Card className="divide-y divide-muted border border-border bg-card shadow-sm">
                {activity.map((item) => (
                  <div key={item.title} className="flex items-center justify-between gap-3 p-4">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="outline" className="text-xs">
                      {item.badge}
                    </Badge>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              {formErrors.title && <p className="text-xs text-red-600">{formErrors.title}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                required
              />
              {formErrors.description && <p className="text-xs text-red-600">{formErrors.description}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Domain</Label>
                <Select
                  value={form.domain}
                  onValueChange={(value) => setForm((f) => ({ ...f, domain: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="fullstack">Full Stack</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.domain && <p className="text-xs text-red-600">{formErrors.domain}</p>}
              </div>
              <div className="space-y-1">
                <Label>Required level</Label>
                <Select
                  value={form.required_level}
                  onValueChange={(value) => setForm((f) => ({ ...f, required_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.required_level && <p className="text-xs text-red-600">{formErrors.required_level}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Complexity</Label>
              <Select
                value={form.complexity}
                onValueChange={(value) => setForm((f) => ({ ...f, complexity: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select complexity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.complexity && <p className="text-xs text-red-600">{formErrors.complexity}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-requirements-pdf">Update Requirements PDF (optional)</Label>
              <Input
                id="edit-requirements-pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => setRequirementsPdfUpdate(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-slate-400">Upload new PDF to re-analyze and update project attributes.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-estimated-duration">Estimated duration (weeks)</Label>
              <Input
                id="edit-estimated-duration"
                type="number"
                min={1}
                value={form.estimated_duration_weeks}
                onChange={(e) => setForm((f) => ({ ...f, estimated_duration_weeks: e.target.value }))}
              />
              {formErrors.estimated_duration_weeks && (
                <p className="text-xs text-red-600">{formErrors.estimated_duration_weeks}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>

          <div className="py-2 text-sm text-muted-foreground">
            This will permanently delete the project and its milestones. This action cannot be undone.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change project status?</DialogTitle>
          </DialogHeader>

          <div className="py-2 text-sm text-muted-foreground">
            {pendingStatus === "open" && "Publishing will make this project visible to candidates."}
            {pendingStatus === "in_progress" && "This indicates work has started on the project."}
            {pendingStatus === "completed" && "This will mark the project as finished."}
            {pendingStatus === "cancelled" && "This will cancel the project. This action cannot be undone."}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusConfirmOpen(false)} disabled={isChangingStatus}>
              Cancel
            </Button>
            <Button
              variant={pendingStatus === "cancelled" ? "destructive" : "default"}
              onClick={() => pendingStatus && handleChangeStatus(pendingStatus)}
              disabled={isChangingStatus}
            >
              {isChangingStatus ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add milestone</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMilestone} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="milestone-title">Title *</Label>
              <Input
                id="milestone-title"
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Setup project structure"
                required
              />
              {milestoneFormErrors.title && <p className="text-xs text-red-600">{milestoneFormErrors.title}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="milestone-description">Description</Label>
              <Textarea
                id="milestone-description"
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe what the student needs to accomplish..."
                rows={3}
              />
              {milestoneFormErrors.description && <p className="text-xs text-red-600">{milestoneFormErrors.description}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="milestone-due-date">Due date</Label>
              <Input
                id="milestone-due-date"
                type="date"
                value={milestoneForm.due_date}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, due_date: e.target.value }))}
              />
              {milestoneFormErrors.due_date && <p className="text-xs text-red-600">{milestoneFormErrors.due_date}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="milestone-required"
                type="checkbox"
                checked={milestoneForm.is_required}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, is_required: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="milestone-required">Required milestone</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddMilestoneOpen(false)} disabled={isCreatingMilestone}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingMilestone}>
                {isCreatingMilestone ? "Adding..." : "Add milestone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMilestoneDetailsOpen} onOpenChange={setIsMilestoneDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMilestone?.title}</DialogTitle>
          </DialogHeader>

          {selectedMilestone && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedMilestone.description || selectedMilestone.hint || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <div>
                    {(() => {
                      const badge = getMilestoneStatusBadge(selectedMilestone.status);
                      return (
                        <Badge variant={badge.variant} className={badge.className}>
                          {badge.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Due Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedMilestone.due_date ?? selectedMilestone.due) || "No due date"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Required</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedMilestone.is_required ? "Yes" : "No"}
                </p>
              </div>

              {/* TODO: Add submissions list if available */}
              <div className="space-y-2">
                <Label>Submissions</Label>
                <p className="text-sm text-muted-foreground">
                  Submissions for this milestone will be displayed here once implemented.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMilestoneDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessProjectDetailsPage;
