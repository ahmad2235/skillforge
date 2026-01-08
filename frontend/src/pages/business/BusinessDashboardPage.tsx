import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Users, CheckCircle, TrendingUp } from "lucide-react";

const stats = [
  { label: "Open projects", value: "8", icon: Briefcase, color: "text-primary bg-primary/15" },
  { label: "Candidates in review", value: "14", icon: Users, color: "text-purple-200 bg-purple-500/15" },
  { label: "Active assignments", value: "6", icon: CheckCircle, color: "text-emerald-200 bg-emerald-500/15" },
  { label: "Milestones on track", value: "82%", icon: TrendingUp, color: "text-amber-200 bg-amber-500/15" },
];

const recentActivity = [
  { title: "New candidate applied", status: "New" },
  { title: "Milestone submitted", status: "Review" },
  { title: "Assignment completed", status: "Done" },
];

export function BusinessDashboardPage() {
  const hasProjects = true; // TODO: wire real data

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 animate-page-enter text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-100">Business dashboard</h1>
        <p className="text-base text-slate-300">
          Manage projects, review candidates, and track milestones.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card 
              key={item.label} 
              className="space-y-3 border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/30 hover:shadow-slate-950/40 transition-shadow animate-card-enter"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{item.label}</p>
                <div className={`p-2 rounded-lg ${item.color.replace('text-', 'text-').replace('bg-', 'bg-')}`}>
                  <Icon size={16} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-100">{item.value}</p>
            </Card>
          );
        })}
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
        <section className="space-y-3 animate-card-enter" style={{ animationDelay: "200ms" }}>
          <h2 className="text-lg font-semibold text-slate-100">Recent activity</h2>
          <Card className="divide-y divide-slate-800 border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/30">
            {recentActivity.map((item) => (
              <div key={item.title} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-800 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-100">{item.title}</p>
                  <p className="text-xs text-slate-400">Just now</p>
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
