import { Link } from "react-router-dom";
import { Users, BookOpen, BarChart3 } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="py-10 animate-page-enter">
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-4">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Manage roadmaps, tasks, assessment questions and monitor platform
          activity.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            to="/admin/learning/blocks"
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all group animate-card-enter"
            style={{ animationDelay: "50ms" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/15 text-primary">
                <BookOpen size={20} />
              </div>
              <h2 className="text-sm font-semibold">Learning / Roadmaps</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Configure blocks and tasks for each level & domain.
            </p>
            <span className="text-xs text-primary group-hover:underline">
              Manage blocks & tasks →
            </span>
          </Link>

          <Link
            to="/admin/assessment/questions"
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all group animate-card-enter"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/15 text-purple-200">
                <Users size={20} />
              </div>
              <h2 className="text-sm font-semibold">Assessment Questions</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Manage placement questions bank by level & domain.
            </p>
            <span className="text-xs text-primary group-hover:underline">
              Manage questions →
            </span>
          </Link>

          <Link
            to="/admin/monitoring"
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all group animate-card-enter"
            style={{ animationDelay: "150ms" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-200">
                <BarChart3 size={20} />
              </div>
              <h2 className="text-sm font-semibold">Monitoring</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Overview of students, projects and AI usage.
            </p>
            <span className="text-xs text-primary group-hover:underline">
              View stats & logs →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
