import { useEffect, useState, useMemo, useCallback, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { parseApiError } from "../../lib/apiErrors";
import { safeLogError } from "../../lib/logger";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { useNavigation } from "../../components/navigation/NavigationContext";
import { EmptyState } from "../../components/feedback/EmptyState";
import { ApiStateCard } from "../../components/shared/ApiStateCard";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { useAppToast } from "../../components/feedback/useAppToast";
import { PlacementWizard } from "../../components/student/PlacementWizard";
import { useAuth } from "../../hooks/useAuth";
type BlockData = {
  id?: number | null;
  title: string;
  description: string;
  taskCount?: number;
  isLocked?: boolean; // MUST be boolean
  unlockRequirement?: string;
  completedTasks?: number;
  totalTasks?: number;
  blockScore?: number | null;
  isComplete?: boolean;
};

type BlockCardProps = BlockData & {
  onStart: () => void;
  isInvalidId: boolean;
};

const BlockCard = ({
  title,
  description,
  taskCount,
  isLocked,
  unlockRequirement,
  onStart,
  isInvalidId,
  completedTasks,
  totalTasks,
  blockScore,
  isComplete,
}: BlockCardProps) => {
  // IMPORTANT: only treat as locked when explicitly boolean true
  const locked = isLocked === true;
  const isDisabled = locked || isInvalidId;

  const hasProgress = typeof completedTasks === 'number' && typeof totalTasks === 'number';
  const progressPercent = hasProgress && totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card
      className={
        "flex flex-col gap-3 border p-4 shadow-sm transition animate-card-enter " +
        (isComplete 
          ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 hover:shadow-xl"
          : locked 
            ? "border-slate-800 bg-slate-900/40 opacity-70" 
            : "border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:shadow-xl")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className={"text-lg font-semibold " + (locked ? "text-slate-500" : "text-slate-50")}>
              {title}
            </h3>
            {isComplete && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
                ✓ Complete
              </span>
            )}
          </div>
          <p className={"text-sm " + (locked ? "text-slate-500" : "text-slate-300")}>
            {description}
          </p>
        </div>

        {typeof taskCount === "number" ? (
          <Badge variant="outline" className="shrink-0 text-xs">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </Badge>
        ) : null}
      </div>

      {hasProgress && totalTasks > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Progress: {completedTasks}/{totalTasks} tasks
            </span>
            {typeof blockScore === 'number' && (
              <span className={isComplete ? "font-medium text-emerald-300" : "font-medium text-slate-300"}>
                Score: {Math.round(blockScore)}/100
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div 
              className={
                "h-full transition-all " + 
                (isComplete ? "bg-emerald-500" : "bg-sky-500")
              }
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" className="w-fit" disabled={isDisabled} onClick={onStart}>
          {isInvalidId ? "Id unavailable" : "Start Block"}
        </Button>

        {locked ? (
          <span className="text-sm text-slate-400">
            Available soon{unlockRequirement ? ` • ${unlockRequirement}` : ""}
          </span>
        ) : null}

        {!locked && isInvalidId ? (
          <span className="text-xs text-amber-300">Block id missing; try refreshing.</span>
        ) : null}
      </div>
    </Card>
  );
};

// Returns the first value that is not undefined and not null.
// This avoids OR (||) which breaks when value is "0"/false.
const pickFirstDefined = (...vals: unknown[]) => {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

export function StudentRoadmapPage() {
  const { setPlacementMode } = useNavigation();
  const navigate = useNavigate();
  const { toastError } = useAppToast();
  const { user } = useAuth();

  const [blocksFromApi, setBlocksFromApi] = useState<BlockData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [roadmap, setRoadmap] = useState<any | null>(null);
  const [placementLevel, setPlacementLevel] = useState<string | null>(null);
  const [placementDomain, setPlacementDomain] = useState<string | null>(null);

  const coerceLocked = (val: unknown): boolean => {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val === 1;
    if (typeof val === "string") {
      const v = val.toLowerCase().trim();
      return v === "true" || v === "1" || v === "locked" || v === "yes";
    }
    return false;
  };

  const coerceTaskCount = (val: unknown): number | undefined => {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string") {
      const n = Number(val);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };

  // make fetch callable for Retry
  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/student/roadmap");
      const payload = res.data ?? {};
      const data = payload.data ?? payload;
      const blocksArray = Array.isArray(data) ? data : [];

      // Placement metadata provided by API (prefer this over auth user)
      const placement = payload.placement ?? null;
      setPlacementLevel(placement?.final_level ?? null);
      setPlacementDomain(placement?.final_domain ?? null);

      const mapped: BlockData[] = blocksArray.map((b: any) => {
        // Choose ONE explicit lock source if present, do not OR them.
        const rawLock = pickFirstDefined(b?.is_locked, b?.isLocked, b?.locked, b?.status);
        const lockedBool =
          typeof rawLock === "string" && rawLock.toLowerCase().trim() !== ""
            ? coerceLocked(rawLock)
            : coerceLocked(rawLock);

        const rawCount = pickFirstDefined(
          b?.task_count,
          b?.taskCount,
          b?.tasks_count,
          b?.tasksCount,
          b?.total_tasks,
          b?.totalTasks
        );

        return {
          id: b?.id ?? null,
          title: b?.title ?? "Untitled Block",
          description: b?.description ?? "",
          taskCount: coerceTaskCount(rawCount),
          isLocked: lockedBool === true, // enforce boolean
          unlockRequirement: (pickFirstDefined(b?.unlock_requirement, b?.unlockRequirement) ??
            undefined) as string | undefined,
          completedTasks: coerceTaskCount(pickFirstDefined(b?.completed_tasks, b?.completedTasks)),
          totalTasks: coerceTaskCount(pickFirstDefined(b?.total_tasks, b?.totalTasks)),
          blockScore: typeof b?.block_score === 'number' ? b.block_score : (typeof b?.blockScore === 'number' ? b.blockScore : null),
          isComplete: b?.is_complete === true || b?.isComplete === true,
        };
      });

      setBlocksFromApi(mapped);
    } catch (err: unknown) {
      setError(err);
      safeLogError(err, "Roadmap");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPlacementMode(false);
    fetchRoadmap();
  }, [fetchRoadmap, setPlacementMode]);

  const { completedTasks, totalTasks } = useMemo(() => {
    const source = blocksFromApi ?? [];
    const total = source.reduce((sum, block) => sum + (block.taskCount ?? 0), 0);
    const completed = 0; // TODO: wire real completion later
    return { completedTasks: completed, totalTasks: total };
  }, [blocksFromApi]);

  const handleStartBlock = (block: BlockData) => {
    const numericId = Number(block.id);

    if (!Number.isFinite(numericId) || numericId <= 0) {
      toastError("Block is missing a valid id.");
      return;
    }

    // IMPORTANT: only block navigation when explicitly locked (boolean true)
    if (block.isLocked === true) {
      toastError("This block is locked. Finish prior blocks first.");
      return;
    }

    navigate(`/student/blocks/${numericId}`, {
      state: {
        blockTitle: block.title,
        blockId: numericId,
      },
    });
  };

  const handleRetry = () => {
    window.location.reload();
  };

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded-md bg-slate-800" />
          <SkeletonList rows={6} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const parsed = parseApiError(error);
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind={parsed.kind} description={parsed.message} primaryActionLabel="Retry" onPrimaryAction={fetchRoadmap} />
      </div>
    );
  }

  // Empty state
  if (!blocksFromApi || (Array.isArray(blocksFromApi) && blocksFromApi.length === 0)) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="space-y-3 border border-slate-800 bg-slate-900/80 p-6 shadow-xl text-center">
          <h3 className="text-lg font-semibold text-slate-50">Start Your Learning Journey</h3>
          <p className="text-sm text-slate-300">
            It looks like you haven't set up your roadmap yet. Take a quick placement test to personalize your learning path.
          </p>
          <div className="mt-4 flex justify-center">
            <PlacementWizard onComplete={fetchRoadmap} />
          </div>
        </Card>
      </div>
    );
  }

  // Success / existing rendering
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 animate-page-enter">
      <header className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30 animate-card-enter">
        <h1 className="text-3xl font-semibold text-slate-50">Your personalized roadmap</h1>
        <p className="text-base text-slate-300">This path updates as you complete tasks.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/30">
        <Badge variant="outline" className="text-sm font-medium">
          {completedTasks}/{totalTasks} tasks completed
        </Badge>
        <div className="text-sm text-slate-300">
          Initial level: <span className="font-medium text-slate-50">{(placementLevel ? (placementLevel.charAt(0).toUpperCase() + placementLevel.slice(1)) : (user?.level ? (user.level.charAt(0).toUpperCase() + user.level.slice(1)) : 'Beginner'))}</span> • {(placementDomain ? (placementDomain.charAt(0).toUpperCase() + placementDomain.slice(1)) : (user?.domain ? (user.domain.charAt(0).toUpperCase() + user.domain.slice(1)) : 'Frontend'))}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-50">Learning Blocks</h2>

        <div className="space-y-3">
          {blocksFromApi.map((block) => {
            const numericId = Number(block.id);
            const isInvalidId = !Number.isFinite(numericId) || numericId <= 0;

            return (
              <BlockCard
                key={block.id ?? block.title}
                {...block}
                isInvalidId={isInvalidId}
                onStart={() => handleStartBlock(block)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default StudentRoadmapPage;
