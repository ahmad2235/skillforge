import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { isAxiosError } from "axios";
import { apiClient } from "../../lib/apiClient";
import { safeLogError } from "../../lib/logger";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { useNavigation } from "../../components/navigation/NavigationContext";
import { ApiStateCard } from "../../components/shared/ApiStateCard";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { useAppToast } from "../../components/feedback/useAppToast";
import { useAuth } from "../../hooks/useAuth";

type PlacementQuestion = {
  id: number;
  level: "beginner" | "intermediate" | "advanced";
  domain: "frontend" | "backend";
  question_text: string;
  type: string;
  difficulty: number;
  metadata?: Record<string, unknown> | null;
};

export const PlacementInProgressPage = () => {
  const { setPlacementMode } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, token } = useAuth();
  const { toastError } = useAppToast();
  const [hintOpen, setHintOpen] = useState(false);

  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ answer?: string }>({});

  // Determine domain from location state (passed from Intro) or user profile
  const domain = location.state?.domain || user?.domain;

  // Extract fetchQuestions so we can reuse it for retries
  const fetchQuestions = async () => {
    if (!domain) {
      // If no domain is selected, redirect back to intro/choose path
      navigate("/student/placement/intro", { replace: true });
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get("/student/assessment/placement/questions", {
        params: { domain }
      });
      const data = res.data.data ?? res.data;
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      safeLogError(err, "PlacementQuestions");
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlacementMode(true);
    void fetchQuestions();
  }, [setPlacementMode]);

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setHintOpen(false);
    }
  };

  const handleSkip = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: "" })); // or null, but API expects string
    handleNext();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        answers: questions.map((q) => ({
          question_id: q.id,
          answer: answers[q.id] ?? "",
        })),
        domain,
      };
      const res = await apiClient.post("/student/assessment/placement/submit", payload);
      const data = res.data.data ?? res.data;

      // Update user context so Sidebar reflects the new level immediately
      if (user && token) {
        const updatedUser = { 
          ...user, 
          level: data.suggested_level, 
          domain: data.suggested_domain 
        };
        login(updatedUser, token);
      }

      navigate("/student/placement/results", { state: data });
    } catch (err: unknown) {
      safeLogError(err, "PlacementSubmit");
      if (isAxiosError(err)) {
        toastError(err.response?.data?.message || "Failed to submit placement.");
      } else {
        toastError("Failed to submit placement.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formSubmitting = !!isSubmitting;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind="network" primaryActionLabel="Retry" onPrimaryAction={fetchQuestions} />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind="not_found" title="No questions available" description="There are no placement questions at the moment." primaryActionLabel="Retry" onPrimaryAction={fetchQuestions} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-10 p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Placement in progress</h1>
        <p className="text-base text-slate-700">Answer what you can. Skips are okay—we're mapping your starting point.</p>
      </div>

      <header className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div className="h-2 w-full rounded-full bg-primary" style={{ width: `${progress}%` }} aria-label="Progress" />
          </div>
          <span className="text-sm font-medium text-slate-800">{Math.round(progress)}% done</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span aria-label="Time remaining">~{Math.max(5, Math.round((questions.length - currentIndex - 1) * 3))} minutes remaining</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Saved just now
          </span>
        </div>
      </header>

      <main className="space-y-6">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">{currentQuestion.question_text}</h2>
            <p className="text-base text-slate-700">
              {currentQuestion.type === "code" ? "Write your code solution below." : "Provide your answer below."}
            </p>
          </div>

          {(currentQuestion.metadata as any)?.example && (
            <Card className="space-y-3 border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-800">Example</div>
              <div className="space-y-1">
                <div className="font-mono text-xs text-slate-700">{(currentQuestion.metadata as any).example.input}</div>
                <div className="font-mono text-xs text-slate-700">{(currentQuestion.metadata as any).example.output}</div>
              </div>
            </Card>
          )}

          <label htmlFor="placement-answer" className="block text-sm font-medium text-slate-700">
            Answer / Response
          </label>
          <textarea
            id="placement-answer"
            aria-invalid={!!fieldErrors.answer}
            aria-describedby={fieldErrors.answer ? "placement-answer-error" : "placement-answer-help"}
            className="w-full min-h-[160px] rounded-md border border-slate-300 p-2 text-sm"
            placeholder="Type your answer here..."
            value={answers[currentQuestion.id] ?? ""}
            onChange={(e) => {
              handleAnswerChange(e.target.value);
              if (fieldErrors.answer) setFieldErrors((prev) => ({ ...prev, answer: undefined }));
            }}
          />
          <p id="placement-answer-help" className="text-xs text-slate-500">
            {/* optional helper text */}
          </p>
          {fieldErrors.answer && (
            <p id="placement-answer-error" role="alert" className="text-sm text-red-600">
              {fieldErrors.answer}
            </p>
          )}

          {(currentQuestion.metadata as any)?.hint && (
            <Collapsible open={hintOpen} onOpenChange={setHintOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="px-0 text-sm text-slate-700">
                  {hintOpen ? "Hide hint" : "Show hint"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {(currentQuestion.metadata as any).hint}
              </CollapsibleContent>
            </Collapsible>
          )}
        </section>
      </main>

      <footer className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <Button variant="ghost" className="px-0 text-slate-700" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button
            variant="ghost"
            className="px-0 text-slate-700"
            onClick={() => {
              setPlacementMode(false);
              navigate("/student/roadmap");
            }}
          >
            Save & exit
          </Button>
        </div>
        <Button size="lg" className="min-w-[140px]" onClick={handleNext} disabled={isSubmitting} aria-busy={isSubmitting}>
          <span className="disabled:inline disabled:block">Submitting…</span>
          <span className="disabled:hidden">{isLast ? "Finish" : "Next"}</span>
        </Button>
      </footer>
    </div>
  );
};

export default PlacementInProgressPage;
