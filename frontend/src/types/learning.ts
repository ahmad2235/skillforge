export interface RoadmapBlock {
  id: number;
  title: string;
  description?: string | null;
  level: "beginner" | "intermediate" | "advanced";
  domain: "frontend" | "backend";
  order_index?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface Task {
  id: number;
  roadmap_block_id: number;
  title: string;
  description?: string | null;
  type: string;
  difficulty: number;
  max_score: number;
  metadata?: Record<string, unknown> | null;
}

export interface TaskEvaluation {
  score: number | null;
  feedback: string | null;
  metadata?: Record<string, unknown> | null;
}
