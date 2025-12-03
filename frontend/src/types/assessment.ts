export type QuestionLevel = "beginner" | "intermediate" | "advanced";
export type QuestionDomain = "frontend" | "backend";

export interface AssessmentQuestion {
  id: number;
  level: QuestionLevel;
  domain: QuestionDomain;
  question_text: string;
  type: string; // e.g. "mcq" | "code" | "short"
  difficulty: number;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}
