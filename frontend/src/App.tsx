import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import { NotFoundPage } from "./pages/errors/NotFoundPage";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import PublicLayout from "./layouts/PublicLayout";
import { NavigationProvider } from "./components/navigation/NavigationContext";
import { ToastProvider } from "./components/feedback/ToastProvider";

// ─────────────────────────────────────────────────────────────
// Lazy-loaded pages (code-split for performance)
// These are role-specific pages that don't need to load upfront
// ─────────────────────────────────────────────────────────────

// Student pages
const StudentDashboardPage = lazy(() => import("./pages/student/StudentDashboardPage").then(m => ({ default: m.StudentDashboardPage })));
const StudentRoadmapPage = lazy(() => import("./pages/student/StudentRoadmapPage").then(m => ({ default: m.StudentRoadmapPage })));
const StudentBlockTasksPage = lazy(() => import("./pages/student/StudentBlockTasksPage").then(m => ({ default: m.StudentBlockTasksPage })));
const StudentTaskSubmitPage = lazy(() => import("./pages/student/StudentTaskSubmitPage").then(m => ({ default: m.StudentTaskSubmitPage })));
const StudentAssignmentsPage = lazy(() => import("./pages/student/StudentAssignmentsPage").then(m => ({ default: m.StudentAssignmentsPage })));
const AcceptInvitePage = lazy(() => import("./pages/student/AcceptInvitePage").then(m => ({ default: m.AcceptInvitePage })));
const StudentAssignmentMilestonesPage = lazy(() => import("./pages/student/StudentAssignmentMilestonesPage").then(m => ({ default: m.StudentAssignmentMilestonesPage })));
const StudentPortfolioPage = lazy(() => import("./pages/student/StudentPortfolioPage").then(m => ({ default: m.StudentPortfolioPage })));
const StudentPortfolioCreatePage = lazy(() => import("./pages/student/StudentPortfolioCreatePage").then(m => ({ default: m.StudentPortfolioCreatePage })));
const StudentPortfolioDetailPage = lazy(() => import("./pages/student/StudentPortfolioDetailPage").then(m => ({ default: m.StudentPortfolioDetailPage })));
const StudentPortfolioEditPage = lazy(() => import("./pages/student/StudentPortfolioEditPage").then(m => ({ default: m.StudentPortfolioEditPage })));
const StudentPlacementPage = lazy(() => import("./pages/student/StudentPlacementPage").then(m => ({ default: m.StudentPlacementPage })));
const PlacementIntroPage = lazy(() => import("./pages/student/PlacementIntroPage").then(m => ({ default: m.PlacementIntroPage })));
const PlacementInProgressPage = lazy(() => import("./pages/student/PlacementInProgressPage").then(m => ({ default: m.PlacementInProgressPage })));
const PlacementResultsPage = lazy(() => import("./pages/student/PlacementResultsPage").then(m => ({ default: m.PlacementResultsPage })));
const StudentProfilePage = lazy(() => import("./pages/student/StudentProfilePage"));

// Business pages
const BusinessDashboardPage = lazy(() => import("./pages/business/BusinessDashboardPage").then(m => ({ default: m.BusinessDashboardPage })));
const BusinessProjectsListPage = lazy(() => import("./pages/business/BusinessProjectsListPage").then(m => ({ default: m.BusinessProjectsListPage })));
const BusinessProjectCreatePage = lazy(() => import("./pages/business/BusinessProjectCreatePage").then(m => ({ default: m.BusinessProjectCreatePage })));
const BusinessProjectDetailsPage = lazy(() => import("./pages/business/BusinessProjectDetailsPage").then(m => ({ default: m.BusinessProjectDetailsPage })));
const BusinessProjectCandidatesPage = lazy(() => import("./pages/business/BusinessProjectCandidatesPage").then(m => ({ default: m.BusinessProjectCandidatesPage })));
const BusinessProjectAssignmentsPage = lazy(() => import("./pages/business/BusinessProjectAssignmentsPage").then(m => ({ default: m.BusinessProjectAssignmentsPage })));
const BusinessProjectSubmissionReviewPage = lazy(() => import("./pages/business/BusinessProjectSubmissionReviewPage").then(m => ({ default: m.BusinessProjectSubmissionReviewPage })));
const BusinessMonitoringPage = lazy(() => import("./pages/business/BusinessMonitoringPage"));
const BusinessProfilePage = lazy(() => import("./pages/business/BusinessProfilePage"));

// Admin pages
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminLearningBlocksPage = lazy(() => import("./pages/admin/AdminLearningBlocksPage").then(m => ({ default: m.AdminLearningBlocksPage })));
const AdminBlockTasksPage = lazy(() => import("./pages/admin/AdminBlockTasksPage").then(m => ({ default: m.AdminBlockTasksPage })));
const AdminAssessmentQuestionsPage = lazy(() => import("./pages/admin/AdminAssessmentQuestionsPage").then(m => ({ default: m.AdminAssessmentQuestionsPage })));
const AdminMonitoringPage = lazy(() => import("./pages/admin/AdminMonitoringPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminStudentsPage = lazy(() => import("./pages/admin/AdminStudentsPage").then(m => ({ default: m.AdminStudentsPage })));
const AdminProjectsPage = lazy(() => import("./pages/admin/AdminProjectsPage"));
const AdminMilestoneSubmissionsPage = lazy(() => import("./pages/admin/AdminMilestoneSubmissionsPage"));
const AdminProfilePage = lazy(() => import("./pages/admin/AdminProfilePage"));

// Chat page (uses socket.io-client)
const ChatPage = lazy(() => import("./pages/ChatPage").then(m => ({ default: m.ChatPage })));

// Minimal loading fallback for lazy routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="text-slate-400 text-sm">Loading...</div>
  </div>
);

function AppShell() {
  return (
    <NavigationProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<AppLayout />}>
          {/* Student (protected) */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentDashboardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/roadmap"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentRoadmapPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/blocks/:id"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentBlockTasksPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/tasks/:id/submit"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentTaskSubmitPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/tasks/:id"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentTaskSubmitPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assignments"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentAssignmentsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accept-invite/:assignmentId"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <AcceptInvitePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assignments/:assignmentId/milestones"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentAssignmentMilestonesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/portfolios"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentPortfolioPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/portfolios/create"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentPortfolioCreatePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/portfolios/:id"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentPortfolioDetailPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/portfolios/:id/edit"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentPortfolioEditPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentProfilePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/projects/assignments/:assignment/portfolio"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <StudentPortfolioCreatePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/placement"
            element={<Navigate to="/student/placement/intro" replace />}
          />
          <Route
            path="/student/placement/intro"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <PlacementIntroPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/placement/progress"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <PlacementInProgressPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/placement/results"
            element={
              <ProtectedRoute requiredRole="student">
                <Suspense fallback={<PageLoader />}>
                  <PlacementResultsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Business (protected) */}
          <Route
            path="/business"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessDashboardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessProjectsListPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/new"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessProjectCreatePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/:projectId"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessProjectDetailsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/:projectId/candidates"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessProjectCandidatesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/:projectId/assignments"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessProjectAssignmentsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/projects/:projectId/assignments/:assignmentId/review"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessProjectSubmissionReviewPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/monitoring"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessMonitoringPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/profile"
            element={
              <ProtectedRoute requiredRole="business">
                <Suspense fallback={<PageLoader />}>
                  <BusinessProfilePage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Chat (protected to authenticated users; ChatPage will enforce role) */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ChatPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Admin (protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminDashboardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminProfilePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminDashboardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminStudentsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminUsersPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/learning/blocks"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminLearningBlocksPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/learning/blocks/:blockId/tasks"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminBlockTasksPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assessment/questions"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminAssessmentQuestionsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/monitoring"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminMonitoringPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminProjectsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/milestones/submissions"
            element={
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<PageLoader />}>
                  <AdminMilestoneSubmissionsPage />
                </Suspense>
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
        </Route>
      </Routes>
    </NavigationProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
