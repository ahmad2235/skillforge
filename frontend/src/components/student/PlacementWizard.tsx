import { useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Loader2, CheckCircle, AlertCircle, Code, Server } from "lucide-react";
import { useAppToast } from "../feedback/useAppToast";
import { cn } from "../../lib/utils";

type Question = {
  id: number;
  question_text: string;
  type: string;
  metadata: {
    options?: string[];
  };
};

type Answer = {
  question_id: number;
  answer: string;
};

interface PlacementWizardProps {
  onComplete: () => void;
}

export function PlacementWizard({ onComplete }: PlacementWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"domain" | "questions" | "submitting" | "success">("domain");
  const [domain, setDomain] = useState<"frontend" | "backend" | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useAppToast();

  const fetchQuestions = async (selectedDomain: "frontend" | "backend") => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/student/assessment/placement/questions?domain=${selectedDomain}`);
      setQuestions(res.data.data);
      setStep("questions");
    } catch (error) {
      console.error("Failed to fetch questions", error);
      toast({
        title: "Error",
        description: "Failed to load placement questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDomainSelect = (selected: "frontend" | "backend") => {
    setDomain(selected);
    fetchQuestions(selected);
  };

  const handleAnswer = (answer: string) => {
    const currentQ = questions[currentQuestionIndex];
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex((a) => a.question_id === currentQ.id);

    if (existingIndex >= 0) {
      newAnswers[existingIndex] = { question_id: currentQ.id, answer };
    } else {
      newAnswers.push({ question_id: currentQ.id, answer });
    }

    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitAnswers();
    }
  };

  const submitAnswers = async () => {
    setStep("submitting");
    try {
      await apiClient.post("/student/assessment/placement/submit", {
        answers,
        domain,
      });
      setStep("success");
      toast({
        title: "Success",
        description: "Placement test completed! Your roadmap is ready.",
      });
      setTimeout(() => {
        setIsOpen(false);
        onComplete();
      }, 2000);
    } catch (error) {
      console.error("Failed to submit answers", error);
      toast({
        title: "Error",
        description: "Failed to submit your answers. Please try again.",
        variant: "destructive",
      });
      setStep("questions"); // Go back to questions on failure
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.question_id === currentQuestion?.id)?.answer;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-semibold">
          Start Your Journey
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === "domain" && "Choose Your Path"}
            {step === "questions" && `Question ${currentQuestionIndex + 1} of ${questions.length}`}
            {step === "submitting" && "Analyzing Skills..."}
            {step === "success" && "You're All Set!"}
          </DialogTitle>
          <DialogDescription>
            {step === "domain" && "Select a specialization to begin your personalized learning path."}
            {step === "questions" && "Answer the following questions to help us gauge your current level."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "domain" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                className={cn(
                  "p-6 cursor-pointer hover:border-primary transition-all flex flex-col items-center gap-4 text-center",
                  domain === "frontend" ? "border-primary bg-primary/5" : ""
                )}
                onClick={() => handleDomainSelect("frontend")}
              >
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Code size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Frontend Development</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Master React, UI/UX, and modern web interfaces.
                  </p>
                </div>
                {isLoading && domain === "frontend" && <Loader2 className="animate-spin" />}
              </Card>

              <Card
                className={cn(
                  "p-6 cursor-pointer hover:border-primary transition-all flex flex-col items-center gap-4 text-center",
                  domain === "backend" ? "border-primary bg-primary/5" : ""
                )}
                onClick={() => handleDomainSelect("backend")}
              >
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Server size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Backend Development</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build robust APIs, databases, and server logic.
                  </p>
                </div>
                {isLoading && domain === "backend" && <Loader2 className="animate-spin" />}
              </Card>
            </div>
          )}

          {step === "questions" && currentQuestion && (
            <div className="space-y-6">
              <div className="text-lg font-medium">{currentQuestion.question_text}</div>
              
              <div className="space-y-3">
                {currentQuestion.metadata?.options?.map((option, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors flex items-center gap-3",
                      currentAnswer === option
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleAnswer(option)}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      currentAnswer === option ? "border-primary" : "border-muted-foreground"
                    )}>
                      {currentAnswer === option && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span>{option}</span>
                  </div>
                ))}
                
                {(!currentQuestion.metadata?.options || currentQuestion.metadata.options.length === 0) && (
                   <textarea
                     className="w-full p-3 border rounded-md min-h-[100px]"
                     placeholder="Type your answer here..."
                     value={currentAnswer || ""}
                     onChange={(e) => handleAnswer(e.target.value)}
                   />
                )}
              </div>
            </div>
          )}

          {step === "submitting" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Evaluating your answers...</p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="p-4 rounded-full bg-green-100 text-green-600">
                <CheckCircle size={48} />
              </div>
              <h3 className="text-xl font-bold">Roadmap Generated!</h3>
              <p className="text-muted-foreground">
                We've created a personalized learning path based on your skills.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "questions" && (
            <Button onClick={handleNext} disabled={!currentAnswer}>
              {currentQuestionIndex === questions.length - 1 ? "Submit" : "Next Question"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
