<?php

namespace App\Notifications;

use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskEvaluationComplete extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Submission $submission)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your task submission was evaluated')
            ->greeting('Hi ' . ($notifiable->name ?? ''))
            ->line('Task: ' . ($this->submission->task->title ?? ''))
            ->line('Score: ' . ($this->submission->ai_score ?? $this->submission->score ?? 'N/A'))
            ->line('Status: ' . ($this->submission->status ?? 'submitted'))
            ->line('Feedback: ' . ($this->submission->ai_feedback ?? 'No feedback provided.'))
            ->action('View Submission', url('/'));
    }
}
