<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $token
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset Your Password - SkillForge',
        );
    }

    public function content(): Content
    {
        $frontendUrl = config('app.frontend_url') ?? config('app.url');
        if (!$frontendUrl) {
            Log::error('Frontend URL not configured for password reset email', ['user_email' => $this->user->email]);
            throw new \RuntimeException('Frontend URL not configured. Set APP_FRONTEND_URL in .env');
        }

        $resetUrl = rtrim($frontendUrl, '/') . '/auth/reset-password?token=' . urlencode($this->token) . '&email=' . urlencode($this->user->email);
        
        Log::debug('Password reset URL generated', [
            'user_email' => $this->user->email,
            'reset_url' => $resetUrl,
        ]);
        
        return new Content(
            view: 'emails.password-reset',
            with: [
                'user' => $this->user,
                'resetUrl' => $resetUrl,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
