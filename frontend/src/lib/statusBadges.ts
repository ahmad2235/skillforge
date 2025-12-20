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
      return makeBadge("Draft", "outline", "bg-slate-100 text-slate-800 border-slate-200");
    case "open":
      return makeBadge("Open", "secondary", "bg-emerald-100 text-emerald-800 border-emerald-200");
    case "in_progress":
      return makeBadge("In progress", "outline", "bg-amber-100 text-amber-800 border-amber-200");
    case "completed":
      return makeBadge("Completed", "secondary", "bg-slate-100 text-slate-800 border-slate-200");
    case "cancelled":
      return makeBadge("Cancelled", "destructive", "bg-slate-100 text-slate-700 border-slate-200");
    case "submitted":
      return makeBadge("Submitted", "secondary", "bg-blue-100 text-blue-800 border-blue-200");
    case "approved":
      return makeBadge("Approved", "secondary", "bg-emerald-100 text-emerald-800 border-emerald-200");
    default:
      return makeBadge("Unknown", "outline", "bg-slate-100 text-slate-700 border-slate-200");
  }
};

export const getMilestoneStatusBadge = (status?: string | null): BadgeConfig => {
  const key = normalize(status);
  switch (key) {
    case "not_started":
      return makeBadge("Not started", "outline", "bg-slate-100 text-slate-700 border-slate-200");
    case "in_progress":
      return makeBadge("In progress", "outline", "bg-amber-100 text-amber-800 border-amber-200");
    case "submitted":
      return makeBadge("Submitted", "secondary", "bg-blue-100 text-blue-800 border-blue-200");
    case "review":
    case "in_review":
      return makeBadge("In review", "outline", "bg-indigo-100 text-indigo-800 border-indigo-200");
    case "approved":
      return makeBadge("Approved", "secondary", "bg-emerald-100 text-emerald-800 border-emerald-200");
    case "completed":
      return makeBadge("Completed", "secondary", "bg-slate-100 text-slate-800 border-slate-200");
    case "cancelled":
      return makeBadge("Cancelled", "destructive", "bg-slate-100 text-slate-700 border-slate-200");
    default:
      return makeBadge("Unknown", "outline", "bg-slate-100 text-slate-700 border-slate-200");
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
