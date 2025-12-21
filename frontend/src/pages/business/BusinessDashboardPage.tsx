import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Link, useNavigate } from "react-router-dom";

const stats = [
  { label: "Open projects", value: "8" },
  { label: "Candidates in review", value: "14" },
  { label: "Active assignments", value: "6" },
  { label: "Milestones on track", value: "82%" },
];

const recentActivity = [
  { title: "New candidate applied", status: "New" },
  { title: "Milestone submitted", status: "Review" },
  { title: "Assignment completed", status: "Done" },
];

export function BusinessDashboardPage() {
  const hasProjects = true; // TODO: wire real data

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Business dashboard</h1>
        <p className="text-base text-slate-700">
          Manage projects, review candidates, and track milestones.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="space-y-2 border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">{item.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
          </Card>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to="/business/projects/new">Create a project</Link>
        </Button>
        <Button variant="link" className="px-0" asChild>
          <Link to="/business/projects">View all projects</Link>
        </Button>
      </section>

      {hasProjects ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
          <Card className="divide-y divide-slate-200 border border-slate-200 bg-white shadow-sm">
            {recentActivity.map((item) => (
              <div key={item.title} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">Just now</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.status}
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start reviewing candidates."
          primaryActionLabel="Create a project"
          onPrimaryAction={() => {}}
        />
      )}
    </div>
  );
}
