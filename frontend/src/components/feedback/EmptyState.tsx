import { Button } from "../ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: React.ReactNode;
};

export const EmptyState = ({
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center animate-card-enter">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        <p className="text-sm text-slate-300">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
        <Button onClick={onPrimaryAction}>{primaryActionLabel}</Button>
        {secondaryActionLabel && onSecondaryAction ? (
          <Button variant="ghost" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default EmptyState;
