import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";

interface OverviewStats {
  users: {
    total: number;
    students: number;
    business: number;
    admins: number;
  };
  learning: {
    blocks: number;
    tasks: number;
    submissions: number;
  };
  projects: {
    total: number;
    assignments: number;
  };
  assessments: {
    placement_results: number;
  };
  ai: {
    total_logs: number;
  };
}

interface RecentUser {
  id: number;
  name: string;
  email: string;
  role: string;
  level: string | null;
  domain: string | null;
  created_at: string;
}

interface RecentSubmission {
  id: number;
  task_title: string;
  user_name: string;
  user_email: string;
  score: number | null;
  created_at: string;
}

interface RecentAssignment {
  id: number;
  project_title: string;
  student_name: string;
  status: string;
  created_at: string;
}

interface DistributionItem {
  role?: string;
  level?: string;
  domain?: string;
  count: number;
}

export function AdminMonitoringPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<
    RecentSubmission[]
  >([]);
  const [recentAssignments, setRecentAssignments] = useState<
    RecentAssignment[]
  >([]);
  const [usersByRole, setUsersByRole] = useState<DistributionItem[]>([]);
  const [studentsByLevel, setStudentsByLevel] = useState<DistributionItem[]>(
    []
  );
  const [studentsByDomain, setStudentsByDomain] = useState<DistributionItem[]>(
    []
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMonitoringData() {
    setIsLoading(true);
    setError(null);

    try {
      const [
        overviewRes,
        usersRes,
        submissionsRes,
        assignmentsRes,
        byRoleRes,
        byLevelRes,
        byDomainRes,
      ] = await Promise.all([
        apiClient.get("/admin/monitoring/overview"),
        apiClient.get("/admin/monitoring/users/recent?limit=5"),
        apiClient.get("/admin/monitoring/submissions/recent?limit=5"),
        apiClient.get("/admin/monitoring/assignments/recent?limit=5"),
        apiClient.get("/admin/monitoring/users/by-role"),
        apiClient.get("/admin/monitoring/students/by-level"),
        apiClient.get("/admin/monitoring/students/by-domain"),
      ]);

      setOverview(overviewRes.data.data);
      setRecentUsers(usersRes.data.data);
      setRecentSubmissions(submissionsRes.data.data);
      setRecentAssignments(assignmentsRes.data.data);
      setUsersByRole(byRoleRes.data.data);
      setStudentsByLevel(byLevelRes.data.data);
      setStudentsByDomain(byDomainRes.data.data);
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Failed to load monitoring data.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMonitoringData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Loading monitoring data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-700 bg-red-900/40 px-4 py-3">
          <p className="text-sm text-red-100">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Platform Monitoring</h1>
          <p className="text-slate-300 text-sm">
            Overview of users, learning progress, projects, and AI usage.
          </p>
        </header>

        {/* Overview Stats Cards */}
        {overview && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wide">
                Total Users
              </h3>
              <p className="text-3xl font-bold text-sky-400 mt-1">
                {overview.users.total}
              </p>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>Students: {overview.users.students}</p>
                <p>Business: {overview.users.business}</p>
                <p>Admins: {overview.users.admins}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wide">
                Learning Content
              </h3>
              <p className="text-3xl font-bold text-emerald-400 mt-1">
                {overview.learning.blocks}
              </p>
              <p className="text-xs text-slate-500">Roadmap blocks</p>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>Tasks: {overview.learning.tasks}</p>
                <p>Submissions: {overview.learning.submissions}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wide">
                Projects
              </h3>
              <p className="text-3xl font-bold text-amber-400 mt-1">
                {overview.projects.total}
              </p>
              <p className="text-xs text-slate-500">Total projects</p>
              <div className="mt-2 text-xs text-slate-500">
                <p>Assignments: {overview.projects.assignments}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wide">
                AI Usage
              </h3>
              <p className="text-3xl font-bold text-purple-400 mt-1">
                {overview.ai.total_logs}
              </p>
              <p className="text-xs text-slate-500">Total AI logs</p>
              <div className="mt-2 text-xs text-slate-500">
                <p>Placements: {overview.assessments.placement_results}</p>
              </div>
            </div>
          </section>
        )}

        {/* Distribution Charts */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold mb-3">Users by Role</h3>
            {usersByRole.length === 0 ? (
              <p className="text-xs text-slate-500">No data available</p>
            ) : (
              <div className="space-y-2">
                {usersByRole.map((item) => (
                  <div
                    key={item.role}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-slate-300 capitalize">
                      {item.role}
                    </span>
                    <span className="text-xs font-medium text-slate-100">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold mb-3">Students by Level</h3>
            {studentsByLevel.length === 0 ? (
              <p className="text-xs text-slate-500">No data available</p>
            ) : (
              <div className="space-y-2">
                {studentsByLevel.map((item) => (
                  <div
                    key={item.level}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-slate-300 capitalize">
                      {item.level ?? "unset"}
                    </span>
                    <span className="text-xs font-medium text-slate-100">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold mb-3">Students by Domain</h3>
            {studentsByDomain.length === 0 ? (
              <p className="text-xs text-slate-500">No data available</p>
            ) : (
              <div className="space-y-2">
                {studentsByDomain.map((item) => (
                  <div
                    key={item.domain}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-slate-300 capitalize">
                      {item.domain ?? "unset"}
                    </span>
                    <span className="text-xs font-medium text-slate-100">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* Recent Users */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold mb-3">Recent Users</h3>
            {recentUsers.length === 0 ? (
              <p className="text-xs text-slate-500">No recent users</p>
            ) : (
              <div className="space-y-2">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="border-b border-slate-800 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="text-xs font-medium text-slate-100">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {user.email} · {user.role}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold mb-3">Recent Submissions</h3>
            {recentSubmissions.length === 0 ? (
              <p className="text-xs text-slate-500">No recent submissions</p>
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="border-b border-slate-800 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="text-xs font-medium text-slate-100">
                      {sub.task_title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      by {sub.user_name} · Score: {sub.score ?? "pending"}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Assignments */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold mb-3">Recent Assignments</h3>
            {recentAssignments.length === 0 ? (
              <p className="text-xs text-slate-500">No recent assignments</p>
            ) : (
              <div className="space-y-2">
                {recentAssignments.map((asn) => (
                  <div
                    key={asn.id}
                    className="border-b border-slate-800 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="text-xs font-medium text-slate-100">
                      {asn.project_title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {asn.student_name} · {asn.status}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {new Date(asn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void loadMonitoringData()}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
