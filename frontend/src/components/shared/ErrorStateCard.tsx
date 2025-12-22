import { isAxiosError } from 'axios';
import { ApiStateCard } from './ApiStateCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { parseApiError, ParsedApiError } from '@/lib/apiErrors';

interface ErrorStateCardProps {
  error?: unknown;
  onRetry?: () => void;
  notFoundTitle?: string;
  forbiddenTitle?: string;
  unauthorizedTitle?: string;
  comingSoon?: boolean;
  comingSoonTitle?: string;
  comingSoonDescription?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

export function ErrorStateCard({
  error,
  onRetry,
  notFoundTitle,
  forbiddenTitle,
  unauthorizedTitle,
  comingSoon = false,
  comingSoonTitle,
  comingSoonDescription,
  primaryActionLabel,
  onPrimaryAction,
}: ErrorStateCardProps) {
  if (comingSoon) {
    return (
      <EmptyState
        title={comingSoonTitle ?? 'Monitoring Coming Soon'}
        description={comingSoonDescription ?? 'This feature is under active development.'}
        primaryActionLabel={primaryActionLabel ?? 'View projects'}
        onPrimaryAction={onPrimaryAction ?? (() => window.location.reload())}
      />
    );
  }

  const parsed: ParsedApiError = parseApiError(error);
  const status = isAxiosError(error) ? (error.response?.status as number | undefined) : undefined;

  if (status === 401) {
    return (
      <EmptyState
        title={unauthorizedTitle ?? 'Login required'}
        description="Please sign in to continue."
        primaryActionLabel={primaryActionLabel ?? 'Go to login'}
        onPrimaryAction={onPrimaryAction ?? (() => window.location.href = '/auth/login')}
      />
    );
  }

  if (status === 403) {
    return (
      <EmptyState
        title={forbiddenTitle ?? 'Not authorized'}
        description={"You don't have access to this resource."}
        primaryActionLabel={primaryActionLabel ?? 'Back'}
        onPrimaryAction={onPrimaryAction ?? (() => window.location.reload())}
      />
    );
  }

  if (status === 404) {
    return (
      <EmptyState
        title={notFoundTitle ?? 'Not found'}
        description={"The requested resource does not exist."}
        primaryActionLabel={primaryActionLabel ?? 'Back'}
        onPrimaryAction={onPrimaryAction ?? (() => window.history.back())}
      />
    );
  }

  if (parsed.kind === 'network') {
    return (
      <ApiStateCard
        kind="network"
        description={parsed.message}
        primaryActionLabel={primaryActionLabel ?? 'Retry'}
        onPrimaryAction={onRetry ?? onPrimaryAction ?? (() => window.location.reload())}
      />
    );
  }

  return (
    <EmptyState
      title="Something went wrong"
      description={parsed.message ?? 'Unable to load data.'}
      primaryActionLabel={primaryActionLabel ?? 'Retry'}
      onPrimaryAction={onRetry ?? onPrimaryAction ?? (() => window.location.reload())}
    />
  );
}

export default ErrorStateCard;
