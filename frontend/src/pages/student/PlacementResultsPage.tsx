import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { useNavigation } from "../../components/navigation/NavigationContext";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { ApiStateCard } from "../../components/shared/ApiStateCard";
import { parseApiError } from "../../lib/apiErrors";

interface QuestionResult {
  question_id: number;
  question_text: string;
  type: "mcq" | "text";
  score: number;
  is_correct: boolean;
  feedback: string | null;
}

interface PlacementResultData {
  placement_result_id?: number;
  score?: number;
  suggested_level?: "beginner" | "intermediate" | "advanced";
  suggested_domain?: "frontend" | "backend";
  total_questions?: number;
  correct_count?: number;
  question_results?: QuestionResult[];
}

export const PlacementResultsPage = () => {
  const { setPlacementMode } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  const [result, setResult] = useState<PlacementResultData | null>(
    (location.state as PlacementResultData) || null
  );
  const [isLoading, setIsLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"unauthorized" | "forbidden" | "not_found" | "validation" | "network" | "server" | "unknown" | null>(null);

  useEffect(() => {
    setPlacementMode(true);
    
    if (!result) {
      setIsLoading(true);
      apiClient.get("/student/assessment/placement/latest")
        .then((res) => {
          setResult(res.data.data);
          setError(null);
          setErrorKind(null);
        })
        .catch((err) => {
          // 404 means user hasn't taken placement - redirect to intro
          const parsed = parseApiError(err);
          if (parsed.kind === "not_found") {
            navigate("/student/placement/intro", { replace: true });
          } else {
            setError(parsed.message);
            setErrorKind(parsed.kind);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [setPlacementMode, result, navigate]);

  const handleViewRoadmap = () => {
    setPlacementMode(false);
    navigate("/student/roadmap");
  };

  const handleRetake = () => {
    // Navigate to placement intro to retake the test
    navigate("/student/placement/intro");
  };

  const getLevelColor = (level: string | undefined) => {
    switch (level) {
      case "advanced":
        return "text-emerald-300";
      case "intermediate":
        return "text-amber-300";
      default:
        return "text-primary";
    }
  };

  const getScoreColor = (score: number | undefined) => {
    if (score === undefined) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-300";
    if (score >= 50) return "text-amber-300";
    return "text-rose-300";
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <ApiStateCard 
          kind={errorKind ?? (result ? "unknown" : "not_found")} 
          title="Could not load results" 
          description={error || "An unexpected error occurred."} 
          primaryActionLabel="Go to Placement"
          onPrimaryAction={handleRetake}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-10 p-6 sm:p-8 animate-page-enter">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Placement results</h1>
        <p className="text-base text-muted-foreground">Here's where you'll start. Your roadmap adapts as you progress.</p>
      </header>

      <Card className="space-y-5 border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
        <header className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-foreground">Your starting point</h2>
          
          {/* Overall Score */}
          <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
            {result.score ?? 0}%
          </div>
          
          <div className={`text-lg font-medium ${getLevelColor(result.suggested_level)}`}>
            Level: {result.suggested_level ? result.suggested_level.charAt(0).toUpperCase() + result.suggested_level.slice(1) : "Beginner"}
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-foreground">
              {result.suggested_domain ? result.suggested_domain.charAt(0).toUpperCase() + result.suggested_domain.slice(1) : "Frontend"}
            </Badge>
          </div>
        </header>

        <section className="space-y-2 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {result.correct_count ?? 0} correct
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-rose-300" />
              {(result.total_questions ?? 0) - (result.correct_count ?? 0)} incorrect
            </span>
          </div>
          <div className="text-muted-foreground">
            This isn't a pass or fail. It's your starting point. As you complete tasks, your level adjusts automatically.
          </div>
        </section>

        {/* Question Results Section */}
        {result.question_results && result.question_results.length > 0 && (
          <section className="border-t border-slate-800 pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between text-sm font-medium text-slate-200 hover:text-foreground"
            >
              <span>View question details</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {showDetails && (
              <div className="mt-4 space-y-3">
                {result.question_results.map((qr, index) => (
                  <div
                    key={qr.question_id}
                    className={`rounded-lg border p-4 ${
                      qr.is_correct ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                          <span className="text-slate-400">Q{index + 1}</span>
                          <Badge variant="secondary" className="text-xs">
                            {qr.type === "mcq" ? "Multiple Choice" : "Text"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{qr.question_text}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {qr.is_correct ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-300" />
                        )}
                        <span className={`text-sm font-semibold ${qr.is_correct ? "text-emerald-200" : "text-rose-200"}`}>
                          {qr.score}%
                        </span>
                      </div>
                    </div>
                    {qr.feedback && (
                      <p className="mt-2 text-sm text-slate-200 italic">
                        {qr.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-2 text-center text-base text-foreground">
          <p>Your personalized roadmap is ready. We'll guide you block by block so you always know the next best step.</p>
          <p>Keep moving; your path will adapt as you progress.</p>
        </section>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button size="lg" className="w-full max-w-xs text-base" onClick={handleViewRoadmap}>
            View Your Roadmap
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PlacementResultsPage;
