import { Card } from "../ui/card";

export const SkeletonLine = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div 
    className={`animate-pulse rounded-md bg-slate-800/60 ${className}`}
    style={style}
    role="status"
    aria-label="Loading..."
  />
);

export const SkeletonCard = () => (
  <Card className="space-y-3 border border-slate-800 bg-slate-900/80 p-4 shadow-sm animate-card-enter">
    <SkeletonLine className="h-4 w-1/3" />
    <SkeletonLine className="h-3 w-3/4" />
    <SkeletonLine className="h-3 w-2/3" />
  </Card>
);

export const SkeletonList = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3" role="status" aria-label="Loading content...">
    {Array.from({ length: rows }).map((_, idx) => (
      <SkeletonLine 
        key={idx} 
        className="h-4 w-full" 
        style={{ animationDelay: `${idx * 50}ms` } as React.CSSProperties}
      />
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

/** Page-level skeleton for dashboard-style layouts */
export const SkeletonPage = () => (
  <div className="space-y-6 animate-page-enter" role="status" aria-label="Loading page...">
    {/* Header skeleton */}
    <div className="space-y-2">
      <SkeletonLine className="h-8 w-48" />
      <SkeletonLine className="h-4 w-72" />
    </div>
    
    {/* Stats row skeleton */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Card key={idx} className="p-4 space-y-2 animate-card-enter" style={{ animationDelay: `${idx * 50}ms` }}>
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-6 w-16" />
        </Card>
      ))}
    </div>
    
    {/* Content skeleton */}
    <div className="space-y-4">
      <SkeletonLine className="h-5 w-32" />
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
    <span className="sr-only">Loading...</span>
  </div>
);

/** Inline spinner for buttons/small areas */
export const Spinner = ({ size = "sm", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };
  
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export default { SkeletonLine, SkeletonCard, SkeletonList, SkeletonPage, Spinner };
