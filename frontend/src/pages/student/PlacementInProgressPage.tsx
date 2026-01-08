import { useEffect, useState, useCallback, useRef } from "react";
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
  const hasFetched = useRef(false);

  // Determine domain from location state (passed from Intro) or user profile
  const domain = location.state?.domain || user?.domain;

  // Extract fetchQuestions so we can reuse it for retries
  const fetchQuestions = useCallback(async () => {
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
      // Check if 409 (already completed)
      if (isAxiosError(err) && err.response?.status === 409) {
        toastError("Placement already completed. You cannot retake it.");
        navigate("/student/placement/results", { replace: true });
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  useEffect(() => {
    setPlacementMode(true);
    
    // Prevent duplicate fetches
    if (hasFetched.current) {
      return;
    }
    hasFetched.current = true;
    
    void fetchQuestions();
  }, [setPlacementMode, fetchQuestions]);

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

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
  };;

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

      // If server accepted and is processing (202), start polling for the result
      if (res.status === 202) {
        const placementId = res.data.data?.placement_result_id;
        toastError('Your placement is being processed — this may take up to a minute.');

        // Poll for the result
        const poll = async (attempts = 0): Promise<void> => {
          try {
            const r = await apiClient.get(`/student/assessment/placement/result/${placementId}`);
            // 200 OK -> we have the evaluated result
            const payload = r.data.data ?? r.data;

            // Update user context
            if (user && token) {
              const updatedUser = { ...user, level: payload.suggested_level, domain: payload.suggested_domain };
              login(updatedUser, token);
            }

            navigate("/student/placement/results", { state: payload });
          } catch (e: unknown) {
            if (isAxiosError(e) && e.response?.status === 202) {
              // Still processing, retry with backoff up to a limit (30 attempts ≈ 60s)
              if (attempts < 30) {
                await new Promise((res) => setTimeout(res, 2000));
                return poll(attempts + 1);
              }
              toastError('Placement processing timed out, please check back later.');
              navigate('/student/placement/results', { replace: true });
            } else {
              safeLogError(e, 'PlacementPolling');
              toastError('Failed to retrieve placement result.');
              navigate('/student/placement/results', { replace: true });
            }
          }
        };

        void poll();
        return; // Don't fallthrough to immediate navigation
      }

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
      // Check if 409 (already completed)
      if (isAxiosError(err) && err.response?.status === 409) {
        toastError("Placement already completed. You cannot retake it.");
        navigate("/student/placement/results", { replace: true });
      } else if (isAxiosError(err)) {
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
    <div className="mx-auto max-w-5xl flex flex-col gap-10 p-4 sm:p-6 animate-page-enter">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Placement in progress</h1>
        <p className="text-base text-muted-foreground">Answer what you can. Skips are okay—we're mapping your starting point.</p>
      </div>

      <header className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/30">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-slate-800">
            <div className="h-2 w-full rounded-full bg-primary" style={{ width: `${progress}%` }} aria-label="Progress" />
          </div>
          <span className="text-sm font-medium text-slate-100">{Math.round(progress)}% done</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span aria-label="Time remaining">~{Math.max(5, Math.round((questions.length - currentIndex - 1) * 3))} minutes remaining</span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
            Saved just now
          </span>
        </div>
      </header>

      <main className="space-y-6">
        <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">{currentQuestion.question_text}</h2>
            <p className="text-base text-muted-foreground">
              {currentQuestion.type === "code" ? "Write your code solution below." : "Provide your answer below."}
            </p>
          </div>

          {(currentQuestion.metadata as any)?.example && (
            <Card className="space-y-3 border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
              <div className="font-semibold text-slate-100">Example</div>
              <div className="space-y-1">
                <div className="font-mono text-xs text-slate-200">{(currentQuestion.metadata as any).example.input}</div>
                <div className="font-mono text-xs text-slate-200">{(currentQuestion.metadata as any).example.output}</div>
              </div>
            </Card>
          )}

          <label htmlFor="placement-answer" className="block text-sm font-medium text-slate-100">
            Answer / Response
          </label>
          <textarea
            id="placement-answer"
            aria-invalid={!!fieldErrors.answer}
            aria-describedby={fieldErrors.answer ? "placement-answer-error" : "placement-answer-help"}
            className="w-full min-h-[160px] rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
            placeholder="Type your answer here..."
            value={answers[currentQuestion.id] ?? ""}
            onChange={(e) => {
              handleAnswerChange(e.target.value);
              if (fieldErrors.answer) setFieldErrors((prev) => ({ ...prev, answer: undefined }));
            }}
          />
          <p id="placement-answer-help" className="text-xs text-muted-foreground">
            {/* optional helper text */}
          </p>
          {fieldErrors.answer && (
            <p id="placement-answer-error" role="alert" className="text-sm text-destructive">
              {fieldErrors.answer}
            </p>
          )}

          {(currentQuestion.metadata as any)?.hint && (
            <Collapsible open={hintOpen} onOpenChange={setHintOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="px-0 text-sm text-slate-200">
                  {hintOpen ? "Hide hint" : "Show hint"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
                {(currentQuestion.metadata as any).hint}
              </CollapsibleContent>
            </Collapsible>
          )}
        </section>
      </main>

      <footer className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="flex items-center gap-3 text-sm text-slate-200">
          <Button variant="ghost" className="px-0 text-slate-200 hover:text-slate-50" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button
            variant="ghost"
            className="px-0 text-slate-200 hover:text-slate-50"
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
