import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/landing/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { BusinessDashboardPage } from "./pages/business/BusinessDashboardPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import { AdminLearningBlocksPage } from "./pages/admin/AdminLearningBlocksPage";
import { AdminBlockTasksPage } from "./pages/admin/AdminBlockTasksPage";
import { AdminAssessmentQuestionsPage } from "./pages/admin/AdminAssessmentQuestionsPage";
import { AdminMonitoringPage } from "./pages/admin/AdminMonitoringPage";
import { AdminStudentsPage } from "./pages/admin/AdminStudentsPage";
import { NotFoundPage } from "./pages/errors/NotFoundPage";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { StudentRoadmapPage } from "./pages/student/StudentRoadmapPage";
import { StudentBlockTasksPage } from "./pages/student/StudentBlockTasksPage";
import { StudentTaskSubmitPage } from "./pages/student/StudentTaskSubmitPage";
import { StudentAssignmentsPage } from "./pages/student/StudentAssignmentsPage";
import { StudentPortfolioPage } from "./pages/student/StudentPortfolioPage";
import { StudentPortfolioCreatePage } from "./pages/student/StudentPortfolioCreatePage";
import { StudentPlacementPage } from "./pages/student/StudentPlacementPage";
import { BusinessProjectsListPage } from "./pages/business/BusinessProjectsListPage";
import { BusinessProjectCreatePage } from "./pages/business/BusinessProjectCreatePage";
import { BusinessProjectDetailsPage } from "./pages/business/BusinessProjectDetailsPage";
import { BusinessProjectCandidatesPage } from "./pages/business/BusinessProjectCandidatesPage";
import { BusinessProjectAssignmentsPage } from "./pages/business/BusinessProjectAssignmentsPage";

function AppShell() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between py-3 px-4">
          <span className="font-bold text-lg">SkillForge</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="hover:text-sky-400">
              Home
            </Link>

            {!isAuthenticated && (
              <>
                <Link to="/auth/login" className="hover:text-sky-400">
                  Login
                </Link>
                <Link to="/auth/register" className="hover:text-sky-400">
                  Register
                </Link>
              </>
            )}

            {isAuthenticated && (
              <>
                {user?.role === "student" && (
                  <>
                    <Link to="/student" className="hover:text-sky-400">
                      Dashboard
                    </Link>
                    <Link to="/student/roadmap" className="hover:text-sky-400">
                      Roadmap
                    </Link>
                    <Link
                      to="/student/assignments"
                      className="hover:text-sky-400"
                    >
                      Assignments
                    </Link>
                    <Link
                      to="/student/portfolios"
                      className="hover:text-sky-400"
                    >
                      Portfolio
                    </Link>
                  </>
                )}
                {user?.role === "business" && (
                  <>
                    <Link to="/business" className="hover:text-sky-400">
                      Dashboard
                    </Link>
                    <Link
                      to="/business/projects"
                      className="hover:text-sky-400"
                    >
                      Projects
                    </Link>
                  </>
                )}
                {user?.role === "admin" && (
                  <Link to="/admin" className="hover:text-sky-400">
                    Admin
                  </Link>
                )}

                <span className="text-xs text-slate-400">
                  {user?.email} ({user?.role})
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Auth */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />

          {/* Student (protected) */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/roadmap"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentRoadmapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/blocks/:blockId/tasks"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentBlockTasksPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/tasks/:taskId/submit"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentTaskSubmitPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assignments"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentAssignmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/portfolios"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentPortfolioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/projects/assignments/:assignment/portfolio"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentPortfolioCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/placement"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentPlacementPage />
              </ProtectedRoute>
            }
          />

          {/* Business (protected) */}
          <Route
            path="/business"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessProjectsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/new"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessProjectCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/:projectId"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessProjectDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/:projectId/candidates"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessProjectCandidatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/:projectId/assignments"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessProjectAssignmentsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin (protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/learning/blocks"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLearningBlocksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/learning/blocks/:blockId/tasks"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminBlockTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assessment/questions"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminAssessmentQuestionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/monitoring"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminMonitoringPage />
              </ProtectedRoute>
            }
          />

          {/* Admin redirects for cleaner navigation */}
          <Route
            path="/admin/learning"
            element={<Navigate to="/admin/learning/blocks" replace />}
          />
          <Route
            path="/admin/assessment"
            element={<Navigate to="/admin/assessment/questions" replace />}
          />
          <Route
            path="/admin/placement"
            element={<Navigate to="/admin/assessment/questions" replace />}
          />

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
