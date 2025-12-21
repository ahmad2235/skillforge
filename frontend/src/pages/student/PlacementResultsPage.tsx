import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { useNavigation } from "../../components/navigation/NavigationContext";

export const PlacementResultsPage = () => {
  const { setPlacementMode } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  const result = (location.state || {}) as {
    placement_result_id?: number;
    score?: number;
    suggested_level?: "beginner" | "intermediate" | "advanced";
    suggested_domain?: "frontend" | "backend";
    total_questions?: number;
    correct_count?: number;
  };

  useEffect(() => {
    setPlacementMode(true);
  }, [setPlacementMode]);

  const handleViewRoadmap = () => {
    setPlacementMode(false);
    navigate("/student/roadmap");
  };

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-10 p-6 sm:p-8">
      <nav className="flex items-center gap-2 text-sm text-slate-600">
        <a href="/" className="font-medium text-slate-700 hover:text-slate-900">Home</a>
        <span className="text-slate-400">/</span>
        <span className="font-medium text-slate-700">Placement</span>
        <span className="text-slate-400">/</span>
        <span className="font-medium text-slate-900">Results</span>
      </nav>

      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Placement results</h1>
        <p className="text-base text-slate-700">Here's where you'll start. Your roadmap adapts as you progress.</p>
      </header>

      <Card className="space-y-5 border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Your starting point</h2>
          <div className="text-lg font-medium text-slate-800">Initial level: {result.suggested_level ? result.suggested_level.charAt(0).toUpperCase() + result.suggested_level.slice(1) : "Intermediate"}</div>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
            <Badge variant="outline" className="text-slate-800">
              {result.suggested_domain ? result.suggested_domain.charAt(0).toUpperCase() + result.suggested_domain.slice(1) : "Frontend"}
            </Badge>
          </div>
        </header>

        <section className="space-y-2 text-center text-sm text-slate-700">
          <div>
            Confidence: {result.total_questions && result.correct_count ? 
              (result.correct_count / result.total_questions > 0.7 ? "High" : result.correct_count / result.total_questions > 0.5 ? "Medium" : "Low") : "Medium"} — based on {result.total_questions || 6} responses.
          </div>
          <div className="text-slate-700">
            This isn't a pass or fail. It's your starting point. As you complete tasks, your level adjusts automatically.
          </div>
        </section>

        <section className="space-y-2 text-center text-base text-slate-800">
          <p>Your personalized roadmap is ready. We'll guide you block by block so you always know the next best step.</p>
          <p>Keep moving; your path will adapt as you progress.</p>
        </section>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button size="lg" className="w-full max-w-xs text-base" onClick={handleViewRoadmap}>
            View Your Roadmap
          </Button>
          <Button variant="ghost" className="text-sm" asChild>
            <Link to="#" aria-label="Retake placement later">
              Retake later
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PlacementResultsPage;
