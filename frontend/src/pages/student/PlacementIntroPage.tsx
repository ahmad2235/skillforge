import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useNavigation } from "../../components/navigation/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { Code, Server, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";

export const PlacementIntroPage = () => {
  const { setPlacementMode } = useNavigation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDomain, setSelectedDomain] = useState<"frontend" | "backend" | null>(null);

  useEffect(() => {
    setPlacementMode(true);
    if (user?.domain) {
      setSelectedDomain(user.domain as "frontend" | "backend");
    }
  }, [setPlacementMode, user]);

  const handleStart = () => {
    if (selectedDomain) {
      navigate("/student/placement/progress", { state: { domain: selectedDomain } });
    }
  };

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-10 p-6 sm:p-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Choose Your Path</h1>
        <p className="text-base text-slate-700">
          Select a specialization to begin your personalized placement test.
        </p>
      </header>

      <main className="space-y-8 max-w-3xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card
            className={cn(
              "p-8 cursor-pointer hover:border-primary transition-all flex flex-col items-center gap-4 text-center relative overflow-hidden",
              selectedDomain === "frontend" ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2" : "hover:shadow-md"
            )}
            onClick={() => setSelectedDomain("frontend")}
          >
            {selectedDomain === "frontend" && (
              <div className="absolute top-3 right-3 text-primary">
                <CheckCircle size={24} />
              </div>
            )}
            <div className="p-4 rounded-full bg-blue-100 text-blue-600">
              <Code size={40} />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Frontend Development</h3>
              <p className="text-sm text-muted-foreground">
                Master React, UI/UX, and modern web interfaces.
              </p>
            </div>
          </Card>

          <Card
            className={cn(
              "p-8 cursor-pointer hover:border-primary transition-all flex flex-col items-center gap-4 text-center relative overflow-hidden",
              selectedDomain === "backend" ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2" : "hover:shadow-md"
            )}
            onClick={() => setSelectedDomain("backend")}
          >
            {selectedDomain === "backend" && (
              <div className="absolute top-3 right-3 text-primary">
                <CheckCircle size={24} />
              </div>
            )}
            <div className="p-4 rounded-full bg-green-100 text-green-600">
              <Server size={40} />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Backend Development</h3>
              <p className="text-sm text-muted-foreground">
                Build robust APIs, databases, and server logic.
              </p>
            </div>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4">
          <Button 
            size="lg" 
            className="w-full max-w-xs text-lg h-12 gap-2" 
            onClick={handleStart}
            disabled={!selectedDomain}
          >
            Start Placement Test <ArrowRight size={18} />
          </Button>
          
          <p className="text-sm text-slate-500">
            Takes about 20 minutes • Autosaves progress
          </p>
        </div>
      </main>
    </div>
  );
};

export default PlacementIntroPage;
