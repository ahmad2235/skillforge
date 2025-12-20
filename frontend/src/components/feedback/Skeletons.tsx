import { Card } from "../ui/card";

export const SkeletonLine = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
);

export const SkeletonCard = () => (
  <Card className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm">
    <SkeletonLine className="h-4 w-1/3" />
    <SkeletonLine className="h-3 w-3/4" />
    <SkeletonLine className="h-3 w-2/3" />
  </Card>
);

export const SkeletonList = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, idx) => (
      <SkeletonLine key={idx} className="h-4 w-full" />
    ))}
  </div>
);

export default { SkeletonLine, SkeletonCard, SkeletonList };
