import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { SkeletonList } from "../../components/feedback/Skeletons";

export function StudentDashboardPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Fetch all assignments (invited, active, completed)
        const response = await apiClient.get("/student/projects/assignments");
        const data = response.data.data ?? response.data;
        setAssignments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  const activeAssignments = assignments.filter(a => a.status === 'accepted');
  const invitedAssignments = assignments.filter(a => a.status === 'invited');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Student Dashboard</h1>
          <SkeletonList rows={3} />
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Welcome back!</h1>
        <p className="text-base text-muted-foreground">
          Track your projects, complete milestones, and build your portfolio.
        </p>
      </header>

      {/* Invitations */}
      {invitedAssignments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            Pending Invitations
            <Badge variant="secondary">{invitedAssignments.length}</Badge>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {invitedAssignments.map((assignment) => (
              <Card key={assignment.id} className="p-4 border-l-4 border-l-blue-500">
                <h3 className="font-semibold text-lg">{assignment.project?.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {assignment.project?.description}
                </p>
                <Link to="/student/assignments">
                  <Button size="sm" className="w-full">View Invitation</Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Active Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Active Projects</h2>
          <Link to="/student/assignments">
            <Button variant="link" size="sm">View All</Button>
          </Link>
        </div>
        
        {activeAssignments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activeAssignments.map((assignment) => (
              <Card key={assignment.id} className="p-6 space-y-4">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{assignment.project?.title}</h3>
                    <Badge>In Progress</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {assignment.project?.description}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Link to={`/student/assignments/${assignment.id}/milestones`} className="flex-1">
                    <Button className="w-full">Continue Work</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center bg-muted/30 border-dashed">
            <p className="text-muted-foreground mb-4">You don't have any active projects right now.</p>
            <Link to="/student/roadmap">
              <Button variant="outline">Check Roadmap</Button>
            </Link>
          </Card>
        )}
      </section>

      {/* Completed Projects */}
      {completedAssignments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Completed Projects</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {completedAssignments.map((assignment) => (
              <Card key={assignment.id} className="p-4 bg-muted/20">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{assignment.project?.title}</h3>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Completed
                  </Badge>
                </div>
                {assignment.student_rating && (
                  <div className="text-xs text-amber-500 mb-3">
                    {"★".repeat(assignment.student_rating)}
                  </div>
                )}
                <Link to="/student/portfolios">
                  <Button variant="outline" size="sm" className="w-full">View in Portfolio</Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
