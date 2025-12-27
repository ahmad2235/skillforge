import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useAppToast } from "../../components/feedback/useAppToast";
import type { CandidateRanked } from "../../types/projects";

export function BusinessProjectCandidatesPage() {
  const { projectId } = useParams();
  const { toastSuccess, toastError } = useAppToast();
  const [candidates, setCandidates] = useState<CandidateRanked[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());
  const [hasActiveAssignment, setHasActiveAssignment] = useState(false);

  if (!projectId) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">No project selected.</p>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        // Load candidates and existing assignments in parallel
        const [candidatesRes, assignmentsRes] = await Promise.all([
          apiClient.get(`/business/projects/${projectId}/candidates`),
          apiClient.get(`/business/projects/${projectId}/assignments`),
        ]);

        const candidatesData = candidatesRes.data.data ?? candidatesRes.data;
        setCandidates(candidatesData as CandidateRanked[]);

        const assignmentsData = assignmentsRes.data.assignments ?? assignmentsRes.data;
        if (Array.isArray(assignmentsData)) {
          const invited = new Set<number>();
          let active = false;
          assignmentsData.forEach((a: any) => {
            if (a.status !== 'removed') {
              invited.add(a.user_id);
            }
            if (a.status === 'accepted' || a.status === 'completed') {
              active = true;
            }
          });
          setInvitedIds(invited);
          setHasActiveAssignment(active);
        }
      } catch (err: any) {
        console.error(err);
        const message =
          err?.response?.data?.message ??
          "Failed to load data for this project.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [projectId]);

  const handleInvite = async (studentId: number) => {
    setInvitingId(studentId);
    try {
      await apiClient.post(`/business/projects/${projectId}/assignments`, {
        user_id: studentId,
      });
      setInvitedIds((prev) => new Set(prev).add(studentId));
      toastSuccess("Invitation sent successfully");
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to send invitation";
      toastError(message);
    } finally {
      setInvitingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">Loading candidates...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="border-destructive bg-destructive/10 p-6">
          <p className="text-destructive text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  if (!candidates.length) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Recommended Candidates</h1>
            <p className="text-muted-foreground text-sm">AI-ranked students for this project</p>
          </div>
          <Link to={`/business/projects/${projectId}`}>
            <Button variant="outline" size="sm">Back to project</Button>
          </Link>
        </header>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">No candidates available for this project yet.</p>
          <p className="text-muted-foreground text-xs mt-2">
            Students who match the project requirements will appear here.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recommended Candidates</h1>
          <p className="text-muted-foreground text-sm">
            Ranked list of {candidates.length} students based on AI evaluation
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/business/projects/${projectId}/assignments`}>
            <Button variant="outline" size="sm">View assignments</Button>
          </Link>
          <Link to={`/business/projects/${projectId}`}>
            <Button variant="outline" size="sm">Back to project</Button>
          </Link>
        </div>
      </header>

      {hasActiveAssignment && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
          <p className="text-sm font-medium">
            This project is currently active or completed. New invitations are disabled.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {candidates.map((entry, index) => {
          const isInvited = invitedIds.has(entry.student.id);
          const isInviting = invitingId === entry.student.id;

          return (
            <Card key={entry.student.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      #{index + 1}
                    </span>
                    <h2 className="text-lg font-semibold text-foreground">
                      {entry.student.name}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {entry.student.email}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs mb-2">
                    {entry.student.level && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded capitalize">
                        {entry.student.level}
                      </span>
                    )}
                    {entry.student.domain && (
                      <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded capitalize">
                        {entry.student.domain}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {entry.reason ?? "No explanation provided."}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-lg font-bold text-primary">
                    {entry.score}
                    <span className="text-xs font-normal text-muted-foreground ml-1">pts</span>
                  </div>
                  {isInvited ? (
                    <Button variant="outline" size="sm" disabled>
                      Invited ✓
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleInvite(entry.student.id)}
                      disabled={isInviting || hasActiveAssignment}
                    >
                      {isInviting ? "Inviting..." : "Invite"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
