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

    public function __construct(
        private readonly ProjectAssignment $assignment,
        private readonly string $token
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $acceptUrl = config('app.frontend_url', config('app.url')) 
            . '/accept-invite/' . $this->assignment->id 
            . '?token=' . $this->token;

        $expiryDays = config('skillforge.invite_expiry_days', 7);
        $projectTitle = $this->assignment->project->title ?? 'Untitled Project';
        $ownerName = $this->assignment->project->owner->name ?? 'Project Owner';

        return (new MailMessage)
            ->subject('Project Invitation: ' . $projectTitle)
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . '!')
            ->line('You have been invited by **' . $ownerName . '** to work on the following project:')
            ->line('**' . $projectTitle . '**')
            ->line($this->assignment->project->description ?? '')
            ->action('Accept Invitation', $acceptUrl)
            ->line('This invitation will expire in **' . $expiryDays . ' days**.')
            ->line('If you prefer to decline, you can do so from your dashboard.')
            ->line('If you were not expecting this invitation, you can safely ignore this email.');
    }
}
