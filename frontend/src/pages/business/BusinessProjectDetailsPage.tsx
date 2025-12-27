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
    estimated_duration_weeks: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
        setMilestones(Array.isArray(milestonePayload) ? milestonePayload : []);
      } catch (milestoneErr: any) {
        const fallback = Array.isArray(projectPayload?.milestones) ? projectPayload.milestones : [];
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
      estimated_duration_weeks: project.estimated_duration_weeks?.toString() || "",
    });
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
      await apiClient.put(`/business/projects/${project.id}`, {
        title: form.title,
        description: form.description,
        domain: form.domain,
        required_level: form.required_level,
        estimated_duration_weeks: form.estimated_duration_weeks ? Number(form.estimated_duration_weeks) : undefined,
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
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      {project.status === 'completed' && (
        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-emerald-900">Project Completed</h3>
                    <p className="text-emerald-700 text-sm">This project has been successfully completed on {formatDate(project.updated_at || new Date().toISOString())}.</p>
                </div>
            </div>
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={() => navigate(`/business/projects/${project.id}/assignments`)}>
                View Final Results
            </Button>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">{project.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <Badge variant="outline" className="capitalize">
              {project.domain}
            </Badge>
            <span className="text-slate-600">• Level: {project.level}</span>
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
          <Card className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
              <p className="text-sm text-slate-700">{project.description}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <span className="text-slate-600">Created: {formatDate(project.created_at ?? project.createdAt)}</span>
              {project.duration && <span className="text-slate-600">Duration: {project.duration}</span>}
              <span className="text-slate-600">ID: {project.id}</span>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: add milestone action
                  }}
                >
                  Add milestone
                </Button>
              </div>

              {hasMilestones ? (
                <div className="space-y-3">
                  {milestones.map((m) => {
                    const badge = getMilestoneStatusBadge(m.status);
                    return (
                      <Card key={m.id} className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{m.title}</p>
                            <p className="text-xs text-slate-600">Due {formatDate(m.due_date ?? m.due)}</p>
                          </div>
                          <Badge variant={badge.variant} className={badge.className}>
                            {badge.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700">{m.hint || m.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              // TODO: navigate to milestone details
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
                  onPrimaryAction={() => {}}
                />
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
              <Card className="divide-y divide-slate-200 border border-slate-200 bg-white shadow-sm">
                {activity.map((item) => (
                  <div key={item.title} className="flex items-center justify-between gap-3 p-4">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
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
                    <SelectItem value="fullstack">Fullstack</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
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
    </div>
  );
};

export default BusinessProjectDetailsPage;
