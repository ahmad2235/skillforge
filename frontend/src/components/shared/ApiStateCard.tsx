import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApiErrorKind } from "@/lib/apiErrors";

interface ApiStateCardProps {
  kind: ApiErrorKind;
  title?: string;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const errorConfig: Record<
  ApiErrorKind,
  {
    title: string;
    description: string;
    badgeVariant: "destructive" | "secondary" | "outline";
    badgeLabel: string;
  }
> = {
  unauthorized: {
    title: "Session expired",
    description: "Please log in again to continue.",
    badgeVariant: "destructive",
    badgeLabel: "Unauthorized",
  },
  forbidden: {
    title: "Access denied",
    description: "You do not have permission to view this resource.",
    badgeVariant: "destructive",
    badgeLabel: "Forbidden",
  },
  not_found: {
    title: "Not found",
    description: "The resource you are looking for does not exist.",
    badgeVariant: "secondary",
    badgeLabel: "Not found",
  },
  validation: {
    title: "Validation error",
    description: "Please check your input and try again.",
    badgeVariant: "outline",
    badgeLabel: "Validation error",
  },
  network: {
    title: "Connection error",
    description: "Unable to connect to the server. Please check your connection and try again.",
    badgeVariant: "destructive",
    badgeLabel: "Network error",
  },
  server: {
    title: "Server error",
    description: "The server encountered an error. Please try again later.",
    badgeVariant: "destructive",
    badgeLabel: "Server error",
  },
  unknown: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    badgeVariant: "secondary",
    badgeLabel: "Error",
  },
};

export function ApiStateCard({
  kind,
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: ApiStateCardProps) {
  const config = errorConfig[kind];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <Card className="border p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{displayTitle}</h3>
            <p className="text-sm text-slate-600">{displayDescription}</p>
          </div>
          <Badge variant={config.badgeVariant} className="shrink-0">
            {config.badgeLabel}
          </Badge>
        </div>

        {(primaryActionLabel || secondaryActionLabel) && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {primaryActionLabel && onPrimaryAction && (
              <Button size="sm" onClick={onPrimaryAction}>
                {primaryActionLabel}
              </Button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <Button size="sm" variant="outline" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
