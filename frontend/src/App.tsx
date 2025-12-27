import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { BusinessDashboardPage } from "./pages/business/BusinessDashboardPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import { AdminLearningBlocksPage } from "./pages/admin/AdminLearningBlocksPage";
import { AdminBlockTasksPage } from "./pages/admin/AdminBlockTasksPage";
import { AdminAssessmentQuestionsPage } from "./pages/admin/AdminAssessmentQuestionsPage";
import AdminMonitoringPage from "./pages/admin/AdminMonitoringPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import { AdminStudentsPage } from "./pages/admin/AdminStudentsPage";
import AdminProjectsPage from "./pages/admin/AdminProjectsPage";
import AdminMilestoneSubmissionsPage from "./pages/admin/AdminMilestoneSubmissionsPage";
import { NotFoundPage } from "./pages/errors/NotFoundPage";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { StudentRoadmapPage } from "./pages/student/StudentRoadmapPage";
import { StudentBlockTasksPage } from "./pages/student/StudentBlockTasksPage";
import { StudentTaskSubmitPage } from "./pages/student/StudentTaskSubmitPage";
import { StudentAssignmentsPage } from "./pages/student/StudentAssignmentsPage";
import { StudentAssignmentMilestonesPage } from "./pages/student/StudentAssignmentMilestonesPage";
import { StudentPortfolioPage } from "./pages/student/StudentPortfolioPage";
import { StudentPortfolioCreatePage } from "./pages/student/StudentPortfolioCreatePage";
import { StudentPlacementPage } from "./pages/student/StudentPlacementPage";
import { PlacementIntroPage } from "./pages/student/PlacementIntroPage";
import { PlacementInProgressPage } from "./pages/student/PlacementInProgressPage";
import { PlacementResultsPage } from "./pages/student/PlacementResultsPage";
import { BusinessProjectsListPage } from "./pages/business/BusinessProjectsListPage";
import { BusinessProjectCreatePage } from "./pages/business/BusinessProjectCreatePage";
import { BusinessProjectDetailsPage } from "./pages/business/BusinessProjectDetailsPage";
import { BusinessProjectCandidatesPage } from "./pages/business/BusinessProjectCandidatesPage";
import { BusinessProjectAssignmentsPage } from "./pages/business/BusinessProjectAssignmentsPage";
import { BusinessProjectSubmissionReviewPage } from "./pages/business/BusinessProjectSubmissionReviewPage";
import BusinessMonitoringPage from "./pages/business/BusinessMonitoringPage";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import BusinessProfilePage from "./pages/business/BusinessProfilePage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AppLayout from "./layouts/AppLayout";
import PublicLayout from "./layouts/PublicLayout";
import { NavigationProvider } from "./components/navigation/NavigationContext";

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
        </Route>

        <Route element={<AppLayout />}>
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
            path="/student/blocks/:id"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentBlockTasksPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/tasks/:id/submit"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentTaskSubmitPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/tasks/:id"
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
            path="/student/assignments/:assignmentId/milestones"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentAssignmentMilestonesPage />
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
            path="/student/profile"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentProfilePage />
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
            element={<Navigate to="/student/placement/intro" replace />}
          />
          <Route
            path="/student/placement/intro"
            element={
              <ProtectedRoute requiredRole="student">
                <PlacementIntroPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/placement/progress"
            element={
              <ProtectedRoute requiredRole="student">
                <PlacementInProgressPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/placement/results"
            element={
              <ProtectedRoute requiredRole="student">
                <PlacementResultsPage />
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
          <Route
            path="/business/projects/:projectId/assignments/:assignmentId/review"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessProjectSubmissionReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/monitoring"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessMonitoringPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/profile"
            element={
              <ProtectedRoute requiredRole="business">
                <BusinessProfilePage />
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
            path="/admin/profile"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminProfilePage />
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
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminUsersPage />
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
          <Route
            path="/admin/projects"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/milestones/submissions"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminMilestoneSubmissionsPage />
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
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
