type BadgeConfig = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

const normalize = (value?: string | null) => (value || "").toLowerCase().replace(/\s+/g, "_");

const makeBadge = (label: string, variant: BadgeConfig["variant"], className?: string): BadgeConfig => ({
  label,
  variant,
  className,
});

export const getProjectStatusBadge = (status?: string | null): BadgeConfig => {
  const key = normalize(status);
  switch (key) {
    case "draft":
      return makeBadge("Draft", "outline", "bg-slate-900/60 text-slate-200 border-slate-700");
    case "open":
      return makeBadge("Open", "secondary", "bg-emerald-500/15 text-emerald-100 border-emerald-500/30");
    case "in_progress":
      return makeBadge("In progress", "outline", "bg-amber-500/15 text-amber-100 border-amber-500/30");
    case "completed":
      return makeBadge("Completed", "secondary", "bg-slate-800/80 text-slate-100 border-slate-700");
    case "cancelled":
      return makeBadge("Cancelled", "destructive", "bg-rose-500/15 text-rose-100 border-rose-500/30");
    case "submitted":
      return makeBadge("Submitted", "secondary", "bg-primary/15 text-primary border-primary/40");
    case "approved":
      return makeBadge("Approved", "secondary", "bg-emerald-500/15 text-emerald-100 border-emerald-500/30");
    default:
      return makeBadge("Unknown", "outline", "bg-slate-900/60 text-slate-200 border-slate-700");
  }
};

export const getMilestoneStatusBadge = (status?: string | null): BadgeConfig => {
  const key = normalize(status);
  switch (key) {
    case "not_started":
      return makeBadge("Not started", "outline", "bg-slate-900/60 text-slate-200 border-slate-700");
    case "in_progress":
      return makeBadge("In progress", "outline", "bg-amber-500/15 text-amber-100 border-amber-500/30");
    case "submitted":
      return makeBadge("Submitted", "secondary", "bg-primary/15 text-primary border-primary/40");
    case "review":
    case "in_review":
      return makeBadge("In review", "outline", "bg-indigo-500/15 text-indigo-100 border-indigo-500/30");
    case "approved":
      return makeBadge("Approved", "secondary", "bg-emerald-500/15 text-emerald-100 border-emerald-500/30");
    case "completed":
      return makeBadge("Completed", "secondary", "bg-slate-800/80 text-slate-100 border-slate-700");
    case "cancelled":
      return makeBadge("Cancelled", "destructive", "bg-rose-500/15 text-rose-100 border-rose-500/30");
    default:
      return makeBadge("Unknown", "outline", "bg-slate-900/60 text-slate-200 border-slate-700");
  }
};

export const getSubmissionStatusBadge = (status?: string | null): BadgeConfig => {
  const key = normalize(status);
  switch (key) {
    case "approved":
      return makeBadge("Approved", "secondary");
    case "rejected":
      return makeBadge("Rejected", "destructive");
    case "reviewed":
      return makeBadge("Reviewed", "outline");
    case "submitted":
      return makeBadge("Submitted", "outline");
    default:
      return makeBadge("Submitted", "outline");
  }
};
