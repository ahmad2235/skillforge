import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type { ProjectAssignment } from "../../types/projects";

export function BusinessProjectAssignmentsPage() {
  const { projectId } = useParams();
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">No project selected.</p>
      </div>
    );
  }

  useEffect(() => {
    async function loadAssignments() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(
          `/business/projects/${projectId}/assignments`
        );
        const data = response.data.data ?? response.data;
        setAssignments(data as ProjectAssignment[]);
      } catch (err: any) {
        console.error(err);
        const message =
          err?.response?.data?.message ??
          "Failed to load assignments for this project.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadAssignments();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Loading assignments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      </div>
    );
  }

  if (!assignments.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">
          No assignments for this project yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Project Assignments</h1>
          <p className="text-slate-300 text-sm">
            Students who have been invited / accepted / completed this project.
          </p>
        </header>

        <div className="space-y-3">
          {assignments.map((assignment) => {
            const student = (assignment as any).student; // لو الـ backend يضمّن بيانات الطالب
            return (
              <div
                key={assignment.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold">
                    Assignment #{assignment.id}
                  </h2>
                  <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                    {assignment.status}
                  </span>
                </div>

                {student && (
                  <p className="text-xs text-slate-400 mb-1">
                    Student: {student.name} ({student.email})
                  </p>
                )}

                {assignment.metadata && (
                  <p className="text-xs text-slate-500">
                    {/* لو حبيت تعرض جزء من الميتاداتا لاحقًا */}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
