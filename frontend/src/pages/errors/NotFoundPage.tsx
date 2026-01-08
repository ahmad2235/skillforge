import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center px-4 animate-page-enter">
        <div className="text-8xl font-bold text-primary/20 mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to="/" className="inline-flex items-center gap-2">
              <Home size={16} />
              Go to Home
            </Link>
          </Button>
          <Button asChild>
            <Link to="#" onClick={() => window.history.back()} className="inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
