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
        'status',             // invited, accepted, declined, completed, removed
        'match_score',        // سكور الترشيح (AI أو غيره)
        'assigned_at',
        'completed_at',
        'notes',              // ملاحظات عامة (لو تستخدمها)

        // الحقول الجديدة للـ feedback والـ rating
        'owner_feedback',
        'student_feedback',
        'rating_from_owner',
        'rating_from_student',
        'metadata',
    ];

    protected $casts = [
        'match_score'   => 'decimal:2',
        'assigned_at'   => 'datetime',
        'completed_at'  => 'datetime',
        'metadata'      => 'array',
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
}
