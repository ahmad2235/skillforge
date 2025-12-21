import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { EmptyState } from "../../components/feedback/EmptyState";
import { apiClient } from "../../lib/apiClient";

const baseKpis = [
  { label: "On-track milestones", key: "on_track" },
  { label: "At-risk milestones", key: "at_risk" },
  { label: "Overdue milestones", key: "overdue" },
  { label: "Avg feedback turnaround", key: "turnaround" },
];

type MonitoringRow = {
  id: number;
  project?: string;
  project_name?: string;
  milestone?: string;
  milestone_name?: string;
  status?: string;
  due?: string;
  due_date?: string;
  student?: string;
  student_name?: string;
};

const statusStyles: Record<string, string> = {
  on_track: "bg-emerald-100 text-emerald-800 border-emerald-200",
  at_risk: "bg-amber-100 text-amber-800 border-amber-200",
  overdue: "bg-rose-100 text-rose-800 border-rose-200",
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const statusLabel = (value?: string) => {
  if (!value) return "Unknown";
  return value
    .replace(/\s+/g, "_")
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
};

export const BusinessMonitoringPage = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();

  const [rows, setRows] = useState<MonitoringRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setUnauthorized(false);
      setError(null);

      const tryFetch = async (url: string) => {
        const res = await apiClient.get(url);
        const payload = res.data?.data ?? res.data ?? [];
        return Array.isArray(payload) ? payload : [];
      };

      try {
        let data: MonitoringRow[] = [];
        try {
          data = await tryFetch("/business/monitoring");
        } catch (err: any) {
          // Ignore if request was cancelled
          if (err?.code === "ERR_CANCELED") {
            return;
          }
          if (err?.status === 401) {
            setUnauthorized(true);
            throw err;
          }
          if (err?.status === 404 && projectId) {
            data = await tryFetch(`/business/projects/${projectId}/monitoring`);
          } else if (err?.status && err.status !== 404) {
            throw err;
          }
          // 404 without projectId - just show empty state
        }

        if (!active) return;
        setRows(data);
      } catch (err: any) {
        if (!active) return;
        if (err?.status === 401) {
          setUnauthorized(true);
        } else {
          setError(err?.message ?? "Unable to load monitoring data");
        }
        setRows([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [projectId]);

  const hasActive = useMemo(() => rows.length > 0, [rows]);
  const computedKpis = useMemo(() => {
    const counts: Record<string, number> = {
      on_track: 0,
      at_risk: 0,
      overdue: 0,
    };

    rows.forEach((row) => {
      const statusKey = (row.status || "").replace(/\s+/g, "_").toLowerCase();
      if (counts[statusKey] !== undefined) {
        counts[statusKey] += 1;
      }
    });

    return baseKpis.map((item) => {
      if (item.key === "turnaround") {
        return { ...item, value: "—" };
      }
      return { ...item, value: counts[item.key] ?? 0 };
    });
  }, [rows]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Monitoring</h1>
        <p className="text-base text-slate-700">Track milestone health across your active projects.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {computedKpis.map((item) => (
          <Card key={item.label} className="space-y-1 border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">{item.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
          </Card>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Select defaultValue="all">
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="frontend-revamp">Frontend Revamp</SelectItem>
            <SelectItem value="api-integration">API Integration</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="any">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any status</SelectItem>
            <SelectItem value="on-track">On track</SelectItem>
            <SelectItem value="at-risk">At risk</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="30d">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Button>Apply</Button>
        <Button variant="outline">Reset</Button>
      </section>

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : unauthorized ? (
        <EmptyState
          title="Login required"
          description="Please log in to view monitoring."
          primaryActionLabel="Go to login"
          onPrimaryAction={() => navigate("/login")}
        />
      ) : hasActive ? (
        <div className="overflow-x-auto">
          <Card className="min-w-full divide-y divide-slate-200 border border-slate-200 bg-white shadow-sm">
            <div className="grid min-w-[720px] grid-cols-6 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Project</span>
              <span>Milestone</span>
              <span>Status</span>
              <span>Due</span>
              <span>Student</span>
              <span className="text-right">Actions</span>
            </div>
            {rows.map((row) => {
              const statusKey = (row.status || "").replace(/\s+/g, "_").toLowerCase();
              return (
                <div
                  key={row.id}
                  className="grid min-w-[720px] grid-cols-6 gap-3 px-4 py-4 text-sm text-slate-900 hover:bg-slate-50"
                >
                  <div className="font-semibold">{row.project || row.project_name || "—"}</div>
                  <div className="text-slate-700">{row.milestone || row.milestone_name || "—"}</div>
                  <div>
                    <Badge variant="outline" className={statusStyles[statusKey] || ""}>
                      {statusLabel(row.status)}
                    </Badge>
                  </div>
                  <div className="text-slate-700">{row.due || row.due_date || "—"}</div>
                  <div className="text-slate-700">{row.student || row.student_name || "—"}</div>
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" disabled className="opacity-60">Open milestone (coming soon)</Button>
                    <Button size="sm" variant="outline" disabled className="opacity-60">Message (coming soon)</Button>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      ) : error ? (
        <EmptyState
          title="Unable to load monitoring"
          description={error}
          primaryActionLabel="Retry"
          onPrimaryAction={() => window.location.reload()}
        />
      ) : (
        <EmptyState
          title="Nothing to monitor yet"
          description="Active projects with milestones will appear here."
          primaryActionLabel="View projects"
          onPrimaryAction={() => navigate("/business/projects")}
        />
      )}
    </div>
  );
};

export default BusinessMonitoringPage;
