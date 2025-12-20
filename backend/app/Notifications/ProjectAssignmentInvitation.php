<?php

namespace App\Notifications;

use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProjectAssignmentInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly ProjectAssignment $assignment)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('You have been invited to a project')
            ->greeting('Hello ' . ($notifiable->name ?? ''))
            ->line('You have been invited to join the project: ' . ($this->assignment->project->title ?? ''))
            ->line('Current status: ' . $this->assignment->status)
            ->action('View Assignment', url('/'))
            ->line('If you were not expecting this, you can ignore this email.');
    }
}
