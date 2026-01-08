import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useNavigation } from "../../components/navigation/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/apiClient";
import { Code, Server, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";

export const PlacementIntroPage = () => {
  const { setPlacementMode } = useNavigation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDomain, setSelectedDomain] = useState<"frontend" | "backend" | null>(null);
  const [hasActivePlacement, setHasActivePlacement] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    setPlacementMode(true);
    
    // Prevent duplicate checks
    if (hasChecked.current) {
      return;
    }
    hasChecked.current = true;
    
    // Check if user already has active placement
    const checkPlacement = async () => {
      try {
        const res = await apiClient.get("/student/assessment/placement/latest");
        if (res.data.data) {
          setHasActivePlacement(true);
          navigate("/student/placement/results", { state: res.data.data });
        }
      } catch (err) {
        // 404 or error means no active placement, which is fine
      } finally {
        setIsChecking(false);
      }
    };
    
    void checkPlacement();
    
    if (user?.domain) {
      setSelectedDomain(user.domain as "frontend" | "backend");
    }
  }, [setPlacementMode, user]);

  const handleStart = () => {
    if (selectedDomain) {
      navigate("/student/placement/progress", { state: { domain: selectedDomain } });
    }
  };

  if (isChecking) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-slate-400">Checking placement status...</div>
      </div>
    );
  }

  if (hasActivePlacement) {
    return null; // Redirected above
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-10 p-6 sm:p-8 animate-page-enter">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Choose Your Path</h1>
        <p className="text-base text-muted-foreground">
          Select a specialization to begin your personalized placement test.
        </p>
      </header>

      <main className="space-y-8 max-w-3xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card
            className={cn(
              "p-8 cursor-pointer hover:border-primary transition-all flex flex-col items-center gap-4 text-center relative overflow-hidden bg-card border-border text-foreground",
              selectedDomain === "frontend" ? "border-primary/70 bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-slate-950" : "hover:shadow-slate-950/30"
            )}
            onClick={() => setSelectedDomain("frontend")}
          >
            {selectedDomain === "frontend" && (
              <div className="absolute top-3 right-3 text-primary">
                <CheckCircle size={24} />
              </div>
            )}
            <div className="p-4 rounded-full bg-primary/15 text-primary">
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
              "p-8 cursor-pointer hover:border-primary transition-all flex flex-col items-center gap-4 text-center relative overflow-hidden bg-card border-border text-foreground",
              selectedDomain === "backend" ? "border-primary/70 bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-slate-950" : "hover:shadow-slate-950/30"
            )}
            onClick={() => setSelectedDomain("backend")}
          >
            {selectedDomain === "backend" && (
              <div className="absolute top-3 right-3 text-primary">
                <CheckCircle size={24} />
              </div>
            )}
            <div className="p-4 rounded-full bg-emerald-500/15 text-emerald-200">
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
          
          <p className="text-sm text-muted-foreground">
            Takes about 20 minutes • Autosaves progress
          </p>
        </div>
      </main>
    </div>
  );
};

export default PlacementIntroPage;
