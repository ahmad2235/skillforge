<?php

namespace App\Modules\Learning\Infrastructure\Models;

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Submission extends Model
{
    use HasFactory;

    protected $table = 'submissions';

    // Canonical evaluation_status values: queued, evaluating, completed, timed_out, manual_review, failed, skipped
    public const EVAL_QUEUED = 'queued';
    public const EVAL_EVALUATING = 'evaluating';
    public const EVAL_COMPLETED = 'completed';
    public const EVAL_TIMED_OUT = 'timed_out';
    public const EVAL_MANUAL_REVIEW = 'manual_review';
    public const EVAL_FAILED = 'failed';
    public const EVAL_SKIPPED = 'skipped';

    protected $fillable = [
        'user_id',
        'task_id',
        'answer_text',
        'attachment_url',
        'status',
        'score',
        'ai_score',
        'ai_feedback',
        'ai_metadata',
        'is_evaluated',
        'metadata',
        'submitted_at',
        'evaluated_at',
        'evaluation_status'
    ];

    protected $casts = [
        'metadata'      => 'array',
        'ai_metadata'   => 'array',
        'is_evaluated'  => 'boolean',
        'submitted_at'  => 'datetime',
        'evaluated_at'  => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    /**
     * Ai evaluations history for this submission (append-only audit trail)
     */
    public function aiEvaluations()
    {
        return $this->hasMany(AiEvaluation::class, 'submission_id');
    }

    /**
     * Latest AI evaluation relationship (via explicit foreign key pointer).
     * This MUST be a relationship instance to support eager loading.
     */
    public function latestAiEvaluation()
    {
        return $this->belongsTo(AiEvaluation::class, 'latest_ai_evaluation_id');
    }

    /**
     * Resolve the latest AI evaluation using fallback logic.
     * Use this method when you need the actual model instance with fallback.
     * 
     * @return AiEvaluation|null
     */
    public function latestAiEvaluationResolved(): ?AiEvaluation
    {
        // If explicit pointer exists, use it (stable and deterministic)
        if ($this->latest_ai_evaluation_id) {
            // Load via relationship if not already loaded
            return $this->latestAiEvaluation ?? AiEvaluation::find($this->latest_ai_evaluation_id);
        }

        // Fallback: return the most recently completed/created ai_evaluation row
        return $this->aiEvaluations()
            ->orderByDesc('completed_at')
            ->orderByDesc('created_at')
            ->first();
    }
}
