<?php

namespace App\Notifications;

use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PlacementResultNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly PlacementResult $placement)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your placement results are ready')
            ->greeting('Hi ' . ($notifiable->name ?? ''))
            ->line('Suggested level: ' . ($this->placement->final_level ?? ''))
            ->line('Suggested domain: ' . ($this->placement->final_domain ?? ''))
            ->line('Overall score: ' . ($this->placement->overall_score ?? 'N/A'))
            ->action('View Roadmap', url('/api/student/roadmap'))
            ->line('You can start your recommended roadmap now.');
    }
}
