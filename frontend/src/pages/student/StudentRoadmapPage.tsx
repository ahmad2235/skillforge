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

type BlockData = {
  id?: number | null;
  title: string;
  description: string;
  taskCount?: number;
  isLocked?: boolean; // MUST be boolean
  unlockRequirement?: string;
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
}: BlockCardProps) => {
  // IMPORTANT: only treat as locked when explicitly boolean true
  const locked = isLocked === true;
  const isDisabled = locked || isInvalidId;

  return (
    <Card
      className={
        "flex flex-col gap-3 border p-4 shadow-sm transition " +
        (locked ? "border-slate-200 bg-slate-50/50 opacity-70" : "border-slate-200 bg-white")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <h3 className={"text-lg font-semibold " + (locked ? "text-slate-500" : "text-slate-900")}>
            {title}
          </h3>
          <p className={"text-sm " + (locked ? "text-slate-500" : "text-slate-600")}>
            {description}
          </p>
        </div>

        {typeof taskCount === "number" ? (
          <Badge variant="outline" className="shrink-0 text-xs">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" className="w-fit" disabled={isDisabled} onClick={onStart}>
          {isInvalidId ? "Id unavailable" : "Start Block"}
        </Button>

        {locked ? (
          <span className="text-sm text-slate-500">
            Available soon{unlockRequirement ? ` • ${unlockRequirement}` : ""}
          </span>
        ) : null}

        {!locked && isInvalidId ? (
          <span className="text-xs text-amber-700">Block id missing; try refreshing.</span>
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

  const [blocksFromApi, setBlocksFromApi] = useState<BlockData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [roadmap, setRoadmap] = useState<any | null>(null);

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
      const data = res.data?.data ?? res.data;
      const blocksArray = Array.isArray(data) ? data : [];

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
          b?.tasksCount
        );

        return {
          id: b?.id ?? null,
          title: b?.title ?? "Untitled Block",
          description: b?.description ?? "",
          taskCount: coerceTaskCount(rawCount),
          isLocked: lockedBool === true, // enforce boolean
          unlockRequirement: (pickFirstDefined(b?.unlock_requirement, b?.unlockRequirement) ??
            undefined) as string | undefined,
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
          <div className="h-6 w-48 animate-pulse rounded-md bg-slate-200" />
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
        <Card className="space-y-3 border border-slate-200 bg-white p-6 shadow-sm text-center">
          <h3 className="text-lg font-semibold text-slate-900">No roadmap content yet</h3>
          <p className="text-sm text-slate-700">
            There are no blocks or tasks available for your roadmap right now. Check back later or explore courses to start learning.
          </p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate("/catalog")}>Browse courses</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Success / existing rendering
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <nav className="flex items-center gap-2 text-sm text-slate-600">
        <Link to="/" className="font-medium text-slate-700 hover:text-slate-900">Home</Link>
        <span className="text-slate-400">/</span>
        <span className="font-medium text-slate-900">Roadmap</span>
      </nav>

      <header className="space-y-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Your personalized roadmap</h1>
        <p className="text-base text-slate-700">This path updates as you complete tasks.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Badge variant="outline" className="text-sm font-medium">
          {completedTasks}/{totalTasks} tasks completed
        </Badge>
        <div className="text-sm text-slate-700">
          Initial level: <span className="font-medium text-slate-900">Intermediate</span> • Frontend
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Learning Blocks</h2>

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
