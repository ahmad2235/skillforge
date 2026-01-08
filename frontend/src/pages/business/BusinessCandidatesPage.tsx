import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { EmptyState } from "../../components/feedback/EmptyState";
import { apiClient } from "../../lib/apiClient";

type Candidate = {
  id: number;
  name?: string;
  full_name?: string;
  fit_score?: number;
  fitScore?: number;
  level?: string;
  domain?: string;
  performance?: string;
  status?: string;
  [key: string]: any;
};

const statusStyles: Record<string, string> = {
  applied: "bg-slate-900/60 text-slate-200 border-slate-700",
  shortlisted: "bg-emerald-500/15 text-emerald-100 border-emerald-500/30",
  invited: "bg-primary/15 text-primary border-primary/40",
  assigned: "bg-indigo-500/15 text-indigo-100 border-indigo-500/30",
  in_progress: "bg-amber-500/15 text-amber-100 border-amber-500/30",
};

const avatarBg = ["bg-indigo-500/20 text-indigo-100", "bg-amber-500/20 text-amber-100", "bg-emerald-500/20 text-emerald-100"];

const statusLabel = (value?: string) => {
  if (!value) return "Unknown";
  return value
    .replace(/\s+/g, "_")
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
};

export const BusinessCandidatesPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>("Candidates");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const toggleFilters = () => setFiltersOpen((prev) => !prev);

  const openCandidate = (c: Candidate) => setSelectedCandidate(c);
  const closeCandidate = () => setSelectedCandidate(null);

  useEffect(() => {
    if (!projectId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      setIsLoading(true);
      setNotFound(false);
      setUnauthorized(false);
      setError(null);

      try {
        const [projectRes, candidatesRes] = await Promise.allSettled([
          apiClient.get(`/business/projects/${projectId}`),
          apiClient.get(`/business/projects/${projectId}/candidates`),
        ]);

        if (!active) return;

        if (projectRes.status === "fulfilled") {
          const projData = projectRes.value.data?.data ?? projectRes.value.data;
          if (projData?.title) {
            setProjectTitle(projData.title);
          }
        } else if (projectRes.status === "rejected" && projectRes.reason?.status === 404) {
          setNotFound(true);
        }

        if (candidatesRes.status === "fulfilled") {
          const payload = candidatesRes.value.data?.data ?? candidatesRes.value.data ?? [];
          setCandidates(Array.isArray(payload) ? payload : []);
        } else {
          const err = candidatesRes.reason;
          if (err?.status === 401) {
            setUnauthorized(true);
          } else if (err?.status === 404) {
            setNotFound(true);
          } else {
            setError(err?.message ?? "Unable to load candidates");
          }
        }
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

  const hasCandidates = useMemo(() => candidates.length > 0, [candidates]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <EmptyState
        title="Login required"
        description="Please log in to view candidates."
        primaryActionLabel="Go to login"
        onPrimaryAction={() => navigate("/login")}
      />
    );
  }

  if (notFound) {
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">{projectTitle}</h1>
          <p className="text-base text-muted-foreground">Ranked by demonstrated skills and project fit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline">Export</Button>
          <Button variant="outline" onClick={toggleFilters}>Filters</Button>
        </div>
      </header>

      {filtersOpen && (
        <Card className="space-y-4 border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Domain</p>
              <Select defaultValue="any">
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="frontend">Frontend</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="fullstack">Fullstack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Level</p>
              <Select defaultValue="any">
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Min score</p>
              <Input type="number" min={0} max={100} placeholder="70" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Status</p>
              <Select defaultValue="any">
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled className="opacity-60">Apply filters (coming soon)</Button>
            <Button variant="outline">Reset</Button>
          </div>
        </Card>
      )} 

      {hasCandidates ? (
        <Card className="divide-y divide-muted border border-border bg-card shadow-sm">
          {candidates.map((c, idx) => {
            const displayName = c.name || c.full_name || `Candidate #${c.id}`;
            const statusKey = (c.status || "").replace(/\s+/g, "_").toLowerCase();
            const fitScore = c.fit_score ?? c.fitScore;

            return (
              <div
                key={c.id}
                className="grid gap-3 p-4 sm:grid-cols-6 sm:items-center hover:bg-muted/30 cursor-pointer"
                onClick={() => openCandidate(c)}
              >
                <div className="flex items-center gap-3 sm:col-span-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${avatarBg[idx % avatarBg.length]}`}
                  >
                    {displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{c.performance || ""}</p>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">Fit score</p>
                  <p className="text-xl font-semibold text-foreground">{fitScore ?? "—"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  {c.domain && (
                    <Badge variant="outline" className="capitalize">
                      {c.domain}
                    </Badge>
                  )}
                  {c.level && <Badge variant="outline">{c.level}</Badge>}
                  <Badge variant="outline" className={statusStyles[statusKey] || ""}>
                    {statusLabel(c.status)}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCandidate(c);
                    }}
                  >
                    View profile
                  </Button>
                  <Button size="sm" variant="outline" disabled className="opacity-60">
                    Assign (coming soon)
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      ) : error ? (
        <EmptyState
          title="Unable to load candidates"
          description={error}
          primaryActionLabel="Retry"
          onPrimaryAction={() => window.location.reload()}
        />
      ) : (
        <EmptyState
          title="No candidates yet"
          description="Once students match your project, they will appear here."
          primaryActionLabel="Share project link (coming soon)"
          onPrimaryAction={() => {}}
        />
      )}
      <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && closeCandidate()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedCandidate?.name || selectedCandidate?.full_name || `Candidate #${selectedCandidate?.id}`}</DialogTitle>
          </DialogHeader>
          {selectedCandidate ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {selectedCandidate.domain && (
                  <Badge variant="outline" className="capitalize">{selectedCandidate.domain}</Badge>
                )}
                {selectedCandidate.level && <Badge variant="outline">{selectedCandidate.level}</Badge>}
                <Badge
                  variant="outline"
                  className={statusStyles[(selectedCandidate.status || "").replace(/\s+/g, "_").toLowerCase()] || ""}
                >
                  {statusLabel(selectedCandidate.status)}
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Card className="space-y-1 border border-border bg-card p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">Fit score</p>
                  <p className="text-lg font-semibold text-foreground">{selectedCandidate.fit_score ?? selectedCandidate.fitScore ?? "—"}</p>
                </Card>
                <Card className="space-y-1 border border-border bg-card p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">Recent performance</p>
                  <p className="text-sm text-muted-foreground">{selectedCandidate.performance}</p>
                </Card>
              </div>
              <Card className="space-y-2 border border-border bg-card p-3 shadow-sm">
                <p className="text-sm font-semibold text-foreground">Recent work</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Project refactor: scored 86%</li>
                  <li>API integration task: scored 82%</li>
                  <li>Placement assessment: level verified</li>
                </ul>
              </Card>
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled className="opacity-60">Invite (coming soon)</Button>
                <Button variant="outline" disabled className="opacity-60">Assign (coming soon)</Button>
                <Button variant="ghost" disabled className="opacity-60">Request re-evaluation (coming soon)</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessCandidatesPage;
