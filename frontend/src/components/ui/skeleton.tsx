import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/60",
        "animate-pulse",
        "bg-gradient-to-r from-muted via-muted/70 to-muted bg-[length:200%_100%]",
        className
      )}
      role="status"
      aria-label="Loading..."
      {...props}
    />
  )
}

export { Skeleton }
