import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import type {
  AssessmentQuestion,
  QuestionDomain,
  QuestionLevel,
} from "../../types/assessment";

type QuestionType = "mcq" | "code" | "short";

export function AdminAssessmentQuestionsPage() {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [levelFilter, setLevelFilter] = useState<QuestionLevel | "all">("all");
  const [domainFilter, setDomainFilter] = useState<QuestionDomain | "all">(
    "all"
  );

  // form state
  const [level, setLevel] = useState<QuestionLevel>("beginner");
  const [domain, setDomain] = useState<QuestionDomain>("frontend");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("short");
  const [difficulty, setDifficulty] = useState<number | "">(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadQuestions() {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (levelFilter !== "all") params.level = levelFilter;
      if (domainFilter !== "all") params.domain = domainFilter;

      const response = await apiClient.get("/admin/assessment/questions", {
        params,
      });
      const data = response.data.data ?? response.data;
      setQuestions(data as AssessmentQuestion[]);
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Failed to load assessment questions.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadQuestions();
  }, [levelFilter, domainFilter]);

  async function handleCreateQuestion(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        level,
        domain,
        question_text: questionText,
        type: questionType,
        difficulty: difficulty === "" ? 1 : Number(difficulty),
      };

      await apiClient.post("/admin/assessment/questions", payload);

      setSuccessMessage("Question created successfully.");
      setQuestionText("");
      setDifficulty(1);
      await loadQuestions();
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Failed to create assessment question.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteQuestion(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this question?"
    );
    if (!confirmed) return;

    setError(null);
    setSuccessMessage(null);

    try {
      await apiClient.delete(`/admin/assessment/questions/${id}`);
      setSuccessMessage("Question deleted.");
      await loadQuestions();
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Failed to delete assessment question.";
      setError(message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Assessment Questions</h1>
          <p className="text-slate-300 text-sm">
            Manage the placement questions bank by level & domain.
          </p>
        </header>

        {/* CREATE FORM */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Create New Question</h2>

          {error && (
            <div className="rounded-md border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-md border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm text-emerald-100">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleCreateQuestion} className="space-y-3">
            <div className="space-y-1">
              <label
                className="block text-sm text-slate-200"
                htmlFor="question_text"
              >
                Question text
              </label>
              <textarea
                id="question_text"
                className="w-full min-h-[80px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                required
                placeholder="Explain the difference between let, const, and var..."
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="block text-sm text-slate-200">Level</label>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as QuestionLevel)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm text-slate-200">Domain</label>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as QuestionDomain)}
                >
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm text-slate-200">Type</label>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={questionType}
                  onChange={(e) =>
                    setQuestionType(e.target.value as QuestionType)
                  }
                >
                  <option value="short">Short answer</option>
                  <option value="code">Code</option>
                  <option value="mcq">Multiple choice</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm text-slate-200">
                  Difficulty (1–5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
            >
              {isSubmitting ? "Creating..." : "Create Question"}
            </button>
          </form>
        </section>

        {/* FILTERS + LIST */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Questions Bank</h2>

            <div className="ml-auto flex flex-wrap gap-2 text-xs">
              <select
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-50"
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value as QuestionLevel | "all")
                }
              >
                <option value="all">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <select
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-50"
                value={domainFilter}
                onChange={(e) =>
                  setDomainFilter(e.target.value as QuestionDomain | "all")
                }
              >
                <option value="all">All domains</option>
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-slate-300 text-sm">Loading questions...</p>
          ) : !questions.length ? (
            <p className="text-slate-400 text-sm">
              No questions found with current filters.
            </p>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-slate-400">
                      ID: {q.id} · {q.level} · {q.domain} · type: {q.type} ·
                      difficulty: {q.difficulty}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteQuestion(q.id)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap">
                    {q.question_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
