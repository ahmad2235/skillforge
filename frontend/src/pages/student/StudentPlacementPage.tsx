import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
import { ApiStateCard } from "../../components/shared/ApiStateCard";
import { SkeletonList } from "../../components/feedback/Skeletons";

type DomainOption = "frontend" | "backend";

interface PlacementQuestion {
  id: number;
  level: "beginner" | "intermediate" | "advanced";
  domain: "frontend" | "backend";
  question_text: string;
  type: string;
  difficulty: number;
  metadata?: Record<string, unknown> | null;
}

interface QuestionResult {
  question_id: number;
  question_text: string;
  type: "mcq" | "text";
  score: number;
  is_correct: boolean;
  feedback: string | null;
}

interface PlacementResult {
  placement_result_id: number;
  score: number;
  suggested_level: "beginner" | "intermediate" | "advanced";
  suggested_domain: "frontend" | "backend";
  total_questions: number;
  correct_count: number;
  question_results?: QuestionResult[];
}

export function StudentPlacementPage() {
  const navigate = useNavigate();
  const [domain, setDomain] = useState<DomainOption>("frontend");
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);

  async function loadQuestions(selectedDomain: DomainOption) {
    setIsLoadingQuestions(true);
    setError(null);
    setResult(null);
    setAnswers({});
    try {
      const response = await apiClient.get(
        "/student/assessment/placement/questions",
        {
          params: { domain: selectedDomain },
        }
      );
      const data = response.data.data ?? response.data;
      setQuestions(data as PlacementQuestion[]);
    } catch (err: any) {
      safeLogError(err, "PlacementQuestions");
      setError(getSafeErrorMessage(err));
    } finally {
      setIsLoadingQuestions(false);
    }
  }

  useEffect(() => {
    void loadQuestions(domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  function handleAnswerChange(questionId: number, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const payload = {
        domain,
        answers: questions.map((q) => ({
          question_id: q.id,
          answer: answers[q.id] ?? "",
        })),
      };

      const response = await apiClient.post(
        "/student/assessment/placement/submit",
        payload
      );
      const data = response.data?.data ?? response.data;
      const placementResult = data as PlacementResult;
      setResult(placementResult);
      
      // Navigate to results page with full result data
      navigate("/student/placement/results", { state: placementResult });
    } catch (err: any) {
      safeLogError(err, "PlacementSubmit");
      setError(getSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-6 sm:p-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Placement Assessment</h1>
          <p className="text-slate-300 text-sm">
            Answer the questions below so we can estimate your level and suggest
            the right roadmap for you.
          </p>
        </header>

        {/* Domain selection */}
        <div className="flex gap-3">
          {(["frontend", "backend"] as DomainOption[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              className={`px-3 py-1 text-sm rounded-md border ${
                domain === d
                  ? "border-sky-500 bg-sky-600/20 text-sky-200"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {isLoadingQuestions && (
          <div className="max-w-3xl">
            <SkeletonList rows={4} />
          </div>
        )}

        {error && (
          <div>
            <ApiStateCard kind="network" description={error} primaryActionLabel="Retry" onPrimaryAction={() => void loadQuestions(domain)} />
          </div>
        )}

        {!isLoadingQuestions && !error && !questions.length && (
          <div>
            <ApiStateCard kind="not_found" title="No questions found" description="No questions exist for this domain yet." primaryActionLabel="Retry" onPrimaryAction={() => void loadQuestions(domain)} />
          </div>
        )}

        {questions.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Q{index + 1} · {q.level} · {q.domain}
                    </span>
                    <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5">
                      {q.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-100">{q.question_text}</p>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Type your answer here..."
                    required
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit assessment"}
            </button>
          </form>
        )}

        {result && (
          <section className="mt-6 rounded-xl border border-emerald-700 bg-emerald-900/30 px-4 py-3 space-y-2">
            <h2 className="text-lg font-semibold">Your Placement Result</h2>
            <p className="text-sm text-emerald-100">
              Suggested level:{" "}
              <span className="font-bold">{result.suggested_level}</span>
            </p>
            <p className="text-sm text-emerald-100">
              Suggested domain:{" "}
              <span className="font-bold">{result.suggested_domain}</span>
            </p>
            <p className="text-sm text-emerald-100">
              Score:{" "}
              <span className="font-bold">
                {result.score} / {result.total_questions}
              </span>{" "}
              ({result.correct_count} correct answers)
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
