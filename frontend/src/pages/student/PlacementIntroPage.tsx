import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { useNavigation } from "../../components/navigation/NavigationContext";

const reassurancePoints = [
  "Skip any question—skipping helps accuracy.",
  "Autosaves as you go.",
  "Takes about 20 minutes.",
];

export const PlacementIntroPage = () => {
  const { setPlacementMode } = useNavigation();
  const navigate = useNavigate();

  useEffect(() => {
    setPlacementMode(true);
  }, [setPlacementMode]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Placement intro</h1>
        <p className="text-base text-slate-700">
          Find your starting point so we can match you to the right tasks.
        </p>
      </header>

      <main className="space-y-7">
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            Find your starting point
          </h2>
          <p className="text-base text-slate-700">
            This short placement isn't a pass/fail test. It maps where you are now so your roadmap fits you from the first task.
          </p>
        </div>

        <ul className="mx-auto flex max-w-md list-disc flex-col gap-2 pl-5 text-sm text-slate-700">
          {reassurancePoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button size="lg" className="w-full max-w-xs text-base" onClick={() => navigate("/student/placement/progress")}>
            Start Your Placement
          </Button>
          <Button variant="ghost" className="text-sm" asChild>
            <Link to="#" aria-label="Do placement later">
              Do it later
            </Link>
          </Button>
          <p className="text-xs text-slate-600">
            You can skip any question; progress saves automatically.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PlacementIntroPage;
