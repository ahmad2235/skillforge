<?php

namespace App\Modules\Projects\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestoneSubmission;

class ProjectAssignment extends Model
{
    use HasFactory;

    protected $table = 'project_assignments';

    protected $fillable = [
        'project_id',
        'user_id',            // الطالب (user) المعيَّن على المشروع
        'team_id',
        'status',             // pending, accepted, declined, cancelled, completed
        'match_score',        // سكور الترشيح (AI أو غيره)
        'invite_token_hash',  // Hashed invitation token
        'invite_expires_at',  // Token expiration
        'invited_at',         // When invitation was created
        'assigned_at',
        'completed_at',
        'notes',              // ملاحظات عامة (لو تستخدمها)
        'cancelled_reason',   // Reason for cancellation

        // الحقول الجديدة للـ feedback والـ rating
        'owner_feedback',
        'student_feedback',
        'rating_from_owner',
        'rating_from_student',
        'metadata',
    ];

    protected $casts = [
        'match_score'      => 'decimal:2',
        'invite_expires_at'=> 'datetime',
        'invited_at'       => 'datetime',
        'assigned_at'      => 'datetime',
        'completed_at'     => 'datetime',
        'metadata'         => 'array',
    ];

    protected static function newFactory()
    {
        return \Database\Factories\ProjectAssignmentFactory::new();
    }

    // المشروع
    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    // الطالب (User)
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // لو التعيين لفريق كامل
    public function team()
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function milestoneSubmissions()
    {
        return $this->hasMany(ProjectMilestoneSubmission::class, 'project_assignment_id');
    }

    /**
     * Check if invite token is valid (not expired and matches hash)
     */
    public function isTokenValid(string $token): bool
    {
        if (!$this->invite_token_hash || !$this->invite_expires_at) {
            return false;
        }

        if ($this->invite_expires_at->isPast()) {
            return false;
        }

        return hash_equals($this->invite_token_hash, hash('sha256', $token));
    }

    /**
     * Check if this assignment can be accepted
     */
    public function canBeAccepted(): bool
    {
        return $this->status === 'pending' 
            && $this->invite_expires_at 
            && $this->invite_expires_at->isFuture();
    }

    /**
     * Check if this assignment can be cancelled
     */
    public function canBeCancelled(): bool
    {
        return $this->status === 'pending';
    }
}
