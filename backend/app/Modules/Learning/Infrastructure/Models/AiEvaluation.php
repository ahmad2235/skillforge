<?php

namespace App\Modules\Learning\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * AiEvaluation model for append-only AI evaluation history.
 * 
 * Each submission can have multiple AI evaluations over time.
 * This table provides full audit trail and history.
 */
class AiEvaluation extends Model
{
    use HasFactory;

    protected $table = 'ai_evaluations';

    protected $fillable = [
        'submission_id',
        'provider',
        'model',
        'prompt_version',
        'status',
        'score',
        'feedback',
        'rubric_scores',
        'metadata',
        'error_message',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'rubric_scores' => 'array',
        'metadata' => 'array',
        'score' => 'float',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * The submission this evaluation belongs to.
     */
    public function submission()
    {
        return $this->belongsTo(Submission::class, 'submission_id');
    }

    /**
     * Scope: Filter by status.
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Only succeeded evaluations.
     */
    public function scopeSucceeded($query)
    {
        return $query->where('status', 'succeeded');
    }

    /**
     * Scope: Only failed evaluations.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Mark evaluation as started.
     */
    public function markAsStarted(): void
    {
        $this->update([
            'status' => 'running',
            'started_at' => now(),
        ]);
    }

    /**
     * Mark evaluation as succeeded with results.
     */
    public function markAsSucceeded(float $score, ?string $feedback = null, ?array $rubricScores = null, ?array $metadata = null): void
    {
        $this->update([
            'status' => 'succeeded',
            'score' => $score,
            'feedback' => $feedback,
            'rubric_scores' => $rubricScores,
            'metadata' => $metadata,
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark evaluation as failed with error message.
     */
    public function markAsFailed(string $errorMessage): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
            'completed_at' => now(),
        ]);
    }
}
