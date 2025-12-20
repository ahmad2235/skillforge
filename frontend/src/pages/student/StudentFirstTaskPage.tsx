import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useNavigation } from "../../components/navigation/NavigationContext";
import { SkeletonCard, SkeletonLine } from "../../components/feedback/Skeletons";

export const StudentFirstTaskPage = () => {
  const { setPlacementMode } = useNavigation();
  const [hintOpen, setHintOpen] = useState(false);
  const isLoading = false;

  useEffect(() => {
    setPlacementMode(false);
  }, [setPlacementMode]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">First task</h1>
        <p className="text-base text-slate-700">Start with a focused task to build momentum. You can save drafts and revisit anytime.</p>
        <div className="space-y-1">
          <p className="text-sm text-slate-600">Block: HTML Fundamentals</p>
          <p className="text-sm text-slate-600">~20–30 minutes</p>
        </div>
      </header>

      <section className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-4 w-2/3" />
            <SkeletonCard />
            <SkeletonLine className="h-3 w-1/3" />
          </div>
        ) : (
          <>
            <p className="text-base text-slate-700">
              Build a simple responsive landing section with a headline, subheadline, and primary button. Keep the layout centered and readable on mobile.
            </p>
            <Card className="space-y-2 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-800">Expected output</div>
              <p>Centered hero with headline, supporting text, and a primary call-to-action button.</p>
            </Card>
            <p className="text-sm text-slate-600">Reviewed automatically with feedback.</p>
          </>
        )}
      </section>

      <section className="space-y-3">
        <Textarea
          className="min-h-[220px]"
          placeholder="/* TODO: replace with task editor/input */"
          aria-label="Task answer input"
        />

        <Collapsible open={hintOpen} onOpenChange={setHintOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="px-0 text-sm text-slate-700">
              {hintOpen ? "Hide hint" : "Show hint"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {/* TODO: wire dynamic hints */}
            Start with semantic HTML, keep spacing consistent, and test at 360px width.
          </CollapsibleContent>
        </Collapsible>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <Button className="min-w-[120px]" size="lg">
            {/* TODO: handle submission */}
            Submit
          </Button>
          <Button variant="ghost" className="text-sm text-slate-700">
            {/* TODO: handle save draft */}
            Save draft
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          You'll see feedback shortly; retries allowed.
        </p>
      </section>
    </div>
  );
};

export default StudentFirstTaskPage;
