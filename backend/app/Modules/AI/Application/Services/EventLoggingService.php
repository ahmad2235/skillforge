<?php

namespace App\Modules\AI\Application\Services;

use App\Models\User;
use App\Models\UserEvent;

class EventLoggingService
{
    public function logEvent(
        ?User $user,
        string $eventType,
        string $targetType,
        ?int $targetId = null,
        ?int $durationSeconds = null,
        ?array $metadata = null
    ): UserEvent {
        return UserEvent::create([
            'user_id' => $user?->id,
            'event_type' => $eventType,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'duration_seconds' => $durationSeconds,
            'metadata' => $metadata,
        ]);
    }
}
