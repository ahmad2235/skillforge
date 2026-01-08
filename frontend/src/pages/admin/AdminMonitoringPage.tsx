import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/feedback/EmptyState";
import { useAppToast } from "@/components/feedback/useAppToast";
import { apiClient } from "@/lib/apiClient";
import { ApiStateCard } from "@/components/shared/ApiStateCard";
import { parseApiError } from "@/lib/apiErrors";
import { SkeletonList } from "@/components/feedback/Skeletons";

type Severity = "info" | "warning" | "error" | "success";

type Kpi = { label: string; key: string; value?: string | number | null };
type EventItem = {
  id: string | number;
  title?: string;
  detail?: string;
  time?: string;
  severity?: Severity;
};
type AiLog = {
  id: string | number;
  action?: string;
  status?: "success" | "warning" | "error" | string;
  timestamp?: string;
  input?: string;
  output?: string;
};

const baseKpis: Kpi[] = [
  { label: "Requests / min", key: "requests_per_min" },
  { label: "Submissions / day", key: "submissions_per_day" },
  { label: "Placements / day", key: "placements_per_day" },
  { label: "AI evaluations queued", key: "ai_evaluations_queued" },
  { label: "Failed jobs", key: "failed_jobs" },
  { label: "Error rate", key: "error_rate" },
];

export default function AdminMonitoringPage() {
  const { toastSuccess } = useAppToast();
  const [timeRange, setTimeRange] = useState("24h");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const [kpis, setKpis] = useState<Kpi[]>(baseKpis);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const fetchMonitoring = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, eventsRes, aiLogsRes] = await Promise.allSettled([
        apiClient.get("/admin/monitoring/overview"),
        apiClient.get("/admin/monitoring/submissions/recent"),
        apiClient.get("/admin/monitoring/ai-logs/recent"),
      ]);

      if (
        [overviewRes, eventsRes, aiLogsRes].some(
          (r) => r.status === "rejected" && ((r.reason?.status ?? r.reason?.response?.status) === 401 || (r.reason?.status ?? r.reason?.response?.status) === 403),
        )
      ) {
        setApiError(parseApiError({ status: 403 }));
        setKpis(baseKpis);
        setEvents([]);
        setAiLogs([]);
        setIsLoading(false);
        return;
      }

      if (overviewRes.status === "fulfilled") {
        const data = overviewRes.value.data?.data ?? overviewRes.value.data ?? {};
        setKpis(
          baseKpis.map((k) => ({
            ...k,
            value: data?.[k.key] ?? data?.[k.key.toUpperCase()] ?? data?.[k.key.replace(/_/g, "")] ?? "—",
          })),
        );
      } else {
        setKpis(baseKpis);
      }

      if (eventsRes.status === "fulfilled") {
        const payload = eventsRes.value.data?.data ?? eventsRes.value.data ?? [];
        setEvents(Array.isArray(payload) ? payload : []);
      } else {
        setEvents([]);
      }

      if (aiLogsRes.status === "fulfilled") {
        const payload = aiLogsRes.value.data?.data ?? aiLogsRes.value.data ?? [];
        setAiLogs(Array.isArray(payload) ? payload : []);
      } else {
        setAiLogs([]);
      }
    } catch (err: unknown) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSeverity = severityFilter === "all" || event.severity === severityFilter;
      const matchesModule = moduleFilter === "all" || moduleFilter;
      return matchesSeverity && Boolean(matchesModule);
    });
  }, [events, moduleFilter, severityFilter]);

  const filteredAiLogs = aiLogs;

  // Apply is not wired — disable and label as coming soon
  const handleApply = () => {
    // noop
  };

  const handleReset = () => {
    setTimeRange("24h");
    setModuleFilter("all");
    setSeverityFilter("all");
  };

  const renderBadgeVariant = (severity: Severity | undefined) => {
    if (severity === "success") return "secondary";
    if (severity === "warning") return "outline";
    if (severity === "error") return "destructive";
    return "secondary";
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (error) {
    const parsed = parseApiError(error);
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind={parsed.kind} description={parsed.message} primaryActionLabel="Retry" onPrimaryAction={fetchMonitoring} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="space-y-3 border border-slate-800 bg-slate-900/80 p-6 shadow-sm text-center">
          <h3 className="text-lg font-semibold text-slate-100">Nothing to monitor</h3>
          <p className="text-sm text-slate-300">There are currently no alerts or items that require your attention.</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={fetchMonitoring}>Refresh</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6 animate-page-enter">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Platform health, throughput, and operational signals.
        </p>
      </header>

        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border p-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))
              : kpis.map((kpi) => (
                  <div key={kpi.label} className="space-y-1 rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-semibold text-foreground">{kpi.value ?? "—"}</p>
                  </div>
                ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7d</SelectItem>
                  <SelectItem value="30d">Last 30d</SelectItem>
                </SelectContent>
              </Select>

              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  <SelectItem value="identity">Identity</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="gamification">Gamification</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as Severity | "all")}> 
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
              <Button disabled className="opacity-60">Apply (coming soon)</Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border p-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border p-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-52" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : apiError ? (
          <ApiStateCard
            kind={apiError.kind}
            description={apiError.message}
            primaryActionLabel="Retry"
            onPrimaryAction={() => window.location.reload()}
          />
        ) : filteredEvents.length === 0 && filteredAiLogs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No monitoring data"
              description="Events and logs will appear here as the platform runs."
              primaryActionLabel="Refresh"
              onPrimaryAction={() => window.location.reload()}
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Recent events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{event.title || "Untitled"}</p>
                        <p className="text-sm text-muted-foreground">{event.detail || "—"}</p>
                      </div>
                      <Badge variant={renderBadgeVariant(event.severity)}>{event.severity || "info"}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{event.time || ""}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent AI logs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredAiLogs.map((log) => (
                  <div key={log.id} className="space-y-2 rounded-lg border p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{log.action || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{log.timestamp || ""}</p>
                      </div>
                      <Badge
                        variant={
                          log.status === "success"
                            ? "secondary"
                            : log.status === "warning"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {log.status || "error"}
                      </Badge>
                    </div>
                    <div className="space-y-1 rounded-md bg-muted/40 p-2">
                      <p className="text-xs font-semibold text-muted-foreground">Input</p>
                      <p className="text-sm text-foreground">{log.input || "—"}</p>
                    </div>
                    <div className="space-y-1 rounded-md bg-muted/40 p-2">
                      <p className="text-xs font-semibold text-muted-foreground">Output</p>
                      <p className="text-sm text-foreground">{log.output || "—"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
}
