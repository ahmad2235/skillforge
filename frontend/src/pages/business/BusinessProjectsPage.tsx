import { useEffect, useRef, useState, useMemo, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/feedback/EmptyState";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAppToast } from "../../components/feedback/useAppToast";
import { apiClient } from "../../lib/apiClient";
import { parseApiError } from "../../lib/apiErrors";
import { ApiStateCard } from "../../components/shared/ApiStateCard";

type Project = {
  id: number;
  title: string;
  status?: string;
  domain?: string;
  level?: string;
  required_level?: string;
  created_at?: string;
  createdAt?: string;
};

const statusVariants: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-slate-100 text-slate-800 border-slate-200",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusLabel = (status?: string) => {
  if (!status) return "Unknown";
  const normalized = status.replace(/\s+/g, "_").toLowerCase();
  return normalized
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
};

export function BusinessProjectsPage() {
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useAppToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<ReturnType<typeof parseApiError> | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    domain: "",
    required_level: "",
    estimated_duration_weeks: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Add local states for mutation UX:
  const [isCreating, setIsCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string> | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      domain: "",
      required_level: "",
      estimated_duration_weeks: "",
    });
    setFormErrors({});
  };

  const loadProjects = async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const res = await apiClient.get("/business/projects");
      const payload = (res.data?.data ?? res.data ?? []) as Project[];
      setProjects(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setApiError(parseApiError(err));
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const hasProjects = useMemo(() => projects.length > 0, [projects]);

  const renderCreatedAt = (project: Project) => {
    const value = project.created_at ?? project.createdAt;
    if (!value) return "";
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleDateString();
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

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});
    try {
      await apiClient.post("/business/projects", {
        title: form.title,
        description: form.description,
        domain: form.domain,
        required_level: form.required_level,
        estimated_duration_weeks: form.estimated_duration_weeks ? Number(form.estimated_duration_weeks) : undefined,
      });
      toastSuccess("Project created");
      setIsCreateOpen(false);
      resetForm();
      await loadProjects();
      setCreateError(null);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 422) {
        const errors = err?.response?.data?.errors || {};
        const mapped: Record<string, string> = {};
        Object.keys(errors).forEach((key) => {
          mapped[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
        });
        setFormErrors(mapped);
      } else {
        const parsed = parseApiError(err);
        setApiError(parsed);
        setCreateError(parsed.message || "Failed to create project");
        toastError(parsed.message || err?.message || "Failed to create project");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleCreateProject(payload: { title: string; description?: string }) {
    if (isCreating) return;
    setIsCreating(true);
    setCreateErrors(null);
    setCreateMessage(null);
    try {
      const res = await apiClient.post("/business/projects", payload);
      const newProject = res.data?.data ?? res.data;
      // optimistic append
      setProjects((prev) => [newProject, ...(prev ?? [])]);
      setCreateMessage("Project created");
      // clear form inputs (assumes setTitle/setDescription exist)
      // setTitle(""); setDescription("");
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const validation = err.response?.data?.errors ?? {};
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(validation)) {
          mapped[k] = Array.isArray(v) ? v.join(" ") : String(v);
        }
        setCreateErrors(mapped);
        setCreateMessage("Please fix the errors below.");
      } else {
        setCreateMessage(isAxiosError(err) ? (err.response?.data?.message || "Failed to create project.") : "Failed to create project.");
      }
    } finally {
      setIsCreating(false);
    }
  }

  // Focus management for New Project dialog
  const newProjectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const newProjectFirstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isCreateOpen) {
      // move focus into dialog (first meaningful field)
      setTimeout(() => newProjectFirstFieldRef.current?.focus(), 0);
    } else {
      // return focus to trigger
      newProjectTriggerRef.current?.focus();
    }
  }, [isCreateOpen]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Projects</h1>
        <p className="text-base text-slate-700">
          Manage projects, review candidates, and track milestones.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {/* New Project trigger */}
        <Button
          ref={newProjectTriggerRef}
          onClick={() => setIsCreateOpen(true)}
          aria-haspopup="dialog"
          aria-controls="new-project-dialog"
          aria-expanded={isCreateOpen}
          aria-label="Create new project"
        >
          Create project
        </Button>
        <Input placeholder="Search projects" className="w-full max-w-xs" />
        {/* TODO: add status filter dropdown */}
      </div>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : apiError ? (
        <ApiStateCard
          kind={apiError.kind}
          description={apiError.message}
          primaryActionLabel="Retry"
          onPrimaryAction={loadProjects}
        />
      ) : hasProjects ? (
        <section className="space-y-3">
          <Card className="divide-y divide-slate-200 border border-slate-200 bg-white shadow-sm">
            {projects.map((project) => (
              <div key={project.id} className="grid gap-3 p-4 sm:grid-cols-6 sm:items-center">
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                  <p className="text-xs text-slate-600">Created {renderCreatedAt(project)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <Badge
                    variant="outline"
                    className={statusVariants[(project.status || "").replace(/\s+/g, "_").toLowerCase()] || ""}
                  >
                    {statusLabel(project.status)}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {project.domain}
                  </Badge>
                  <span className="text-xs text-slate-600">Level: {project.level || project.required_level}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:col-span-2 sm:justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      navigate(`/business/projects/${project.id}`, {
                        state: { projectTitle: project.title, projectId: project.id },
                      });
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigate(`/business/projects/${project.id}/candidates`, {
                        state: { projectTitle: project.title },
                      });
                    }}
                  >
                    Candidates
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </section>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create a project to start receiving candidates."
          primaryActionLabel="Create project"
          onPrimaryAction={() => setIsCreateOpen(true)}
        />
      )}

      {/* New Project dialog / sheet */}
      {isCreateOpen && (
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            resetForm();
            setCreateError(null);
          }
        }}>
          <DialogContent id="new-project-dialog" aria-modal="true" role="dialog">
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              {createError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createError}
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  ref={newProjectFirstFieldRef}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
                {formErrors.title && <p className="text-xs text-red-600">{formErrors.title}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
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
                <Label htmlFor="estimated_duration_weeks">Estimated duration (weeks)</Label>
                <Input
                  id="estimated_duration_weeks"
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
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

};

export default BusinessProjectsPage;
