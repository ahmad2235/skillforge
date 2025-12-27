import { Link } from "react-router-dom";

export default function AdminDashboardPage() {
  return (
    <div className="py-10">
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-4">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Manage roadmaps, tasks, assessment questions and monitor platform
          activity.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold mb-1">Learning / Roadmaps</h2>
            <p className="text-xs text-muted-foreground mb-2">
              Configure blocks and tasks for each level & domain.
            </p>
            <Link
              to="/admin/learning/blocks"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Manage blocks & tasks →
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold">Assessment Questions</h2>
            <p className="text-xs text-muted-foreground">
              Manage placement questions bank by level & domain.
            </p>
            <Link
              to="/admin/assessment/questions"
              className="inline-block mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Manage questions →
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold">Monitoring</h2>
            <p className="text-xs text-muted-foreground">
              Overview of students, projects and AI usage.
            </p>
            <Link
              to="/admin/monitoring"
              className="inline-block mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View stats & logs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
