export type AssignmentStatus = "invited" | "active" | "completed" | "declined";

export type ProjectStatus = "draft" | "open" | "in_progress" | "completed";

export interface ProjectSummary {
  id: number;
  title: string;
  description?: string | null;
  level?: string | null;
  domain?: string | null;
}

export interface ProjectAssignment {
  id: number;
  project_id: number;
  user_id: number;
  status: string; // "invited" | "accepted" | "completed" | "declined" | "removed"
  // Backend returns project attached with the assignment
  project?: ProjectSummary;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  milestone_submissions?: Array<{
    id: number;
    status: string;
    reviewed_at?: string;
  }>;
  metadata?: Record<string, unknown> | null;
  student_rating?: number;
  student_feedback?: string;
  business_rating?: number;
  business_feedback?: string;
}

export interface PortfolioItem {
  id: number;
  assignment_id: number;
  title: string;
  description?: string | null;
  github_url?: string | null;
  live_demo_url?: string | null;
  score?: number | null;
  feedback?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface BusinessProject {
  id: number;
  title: string;
  description?: string | null;
  level?: "beginner" | "intermediate" | "advanced" | null;
  domain?: "frontend" | "backend" | null;
  status?: ProjectStatus | string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * For later (when we build candidates page)
 */
export interface CandidateRanked {
  student: {
    id: number;
    name: string;
    email: string;
    level?: string | null;
    domain?: string | null;
  };
  score: number;
  reason: string;
}
