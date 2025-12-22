# AI Evaluation Hybrid Storage - Usage Guide

## Overview

The hybrid AI evaluation storage system provides:
- **Append-only history** in `ai_evaluations` table (audit trail)
- **Latest snapshot** in `submissions` table (fast UI reads)
- **Full backward compatibility** with existing Phase 9 code

---

## Usage Examples

### 1. Record a Successful AI Evaluation

```php
use App\Modules\Learning\Application\Services\AiEvaluationService;
use App\Modules\Learning\Infrastructure\Models\Submission;

$service = app(AiEvaluationService::class);
$submission = Submission::find($submissionId);

// Record evaluation (creates history + updates snapshot)
$aiEvaluation = $service->recordEvaluation($submission, [
    'provider' => 'openai',
    'model' => 'gpt-4',
    'prompt_version' => 'v1.2',
    'score' => 88.5,
    'feedback' => 'Excellent work! Your form has proper validation...',
    'rubric_scores' => [
        ['criterion' => 'Form Structure', 'score' => 38, 'max_points' => 40],
        ['criterion' => 'Input Validation', 'score' => 28, 'max_points' => 30],
        ['criterion' => 'Styling', 'score' => 22, 'max_points' => 30],
    ],
    'metadata' => [
        'tokens_used' => 250,
        'response_time_ms' => 1500,
        'temperature' => 0.7,
    ],
]);

// Result:
// - ai_evaluations table: new row inserted
// - submissions table: ai_score, ai_feedback, final_score, rubric_scores updated
// - submissions.latest_ai_evaluation_id: points to new row
```

### 2. Record a Failed Evaluation

```php
try {
    // AI API call fails...
} catch (\Exception $e) {
    $service->recordFailure($submission, $e->getMessage(), [
        'provider' => 'openai',
        'model' => 'gpt-4',
        'prompt_version' => 'v1.2',
    ]);
}

// Result:
// - ai_evaluations table: failure record created
// - submissions table: NOT updated (preserves previous state)
```

### 3. Re-evaluate a Submission

```php
// First evaluation
$eval1 = $service->recordEvaluation($submission, [
    'model' => 'gpt-4',
    'score' => 75.0,
    'feedback' => 'Initial feedback...',
]);

// Re-evaluate with different prompt/model
$eval2 = $service->recordEvaluation($submission, [
    'model' => 'gpt-4-turbo',
    'prompt_version' => 'v2.0',
    'score' => 88.0,
    'feedback' => 'Improved feedback...',
]);

// Result:
// - 2 rows in ai_evaluations (full history preserved)
// - submissions table shows latest values (88.0)
// - submissions.latest_ai_evaluation_id → $eval2->id
```

### 4. View Evaluation History

```php
// Get full history (most recent first)
$history = $service->getEvaluationHistory($submission);

foreach ($history as $eval) {
    echo "Score: {$eval->score}, Model: {$eval->model}, Date: {$eval->created_at}\n";
}

// Or use relationship
$allEvals = $submission->aiEvaluations; // Ordered by created_at desc
$latestEval = $submission->latestAiEvaluation; // Via FK (faster)
```

### 5. Display to UI (Fast Read)

```php
// No joins needed - everything in submissions table
$submission = Submission::with('task')->find($id);

return [
    'score' => $submission->effective_score, // Uses final_score ?? score
    'feedback' => $submission->ai_feedback,
    'rubric_breakdown' => $submission->rubric_scores,
    'evaluated_by' => $submission->evaluated_by, // 'system' or 'admin'
    'evaluated_at' => $submission->evaluated_at,
];
```

### 6. Admin Re-evaluation Workflow

```php
// Admin wants to see previous AI attempts
$previousAttempts = $submission->aiEvaluations()
    ->where('status', 'succeeded')
    ->get();

// Admin triggers re-evaluation
$newEval = $service->recordEvaluation($submission, [
    'provider' => 'anthropic',
    'model' => 'claude-3-opus',
    'score' => 92.0,
    'feedback' => 'Re-evaluated with Claude...',
]);

// History shows: gpt-4 → gpt-4-turbo → claude-3-opus
```

### 7. Integration with Job Queue

```php
// In EvaluateSubmissionJob
use App\Modules\Learning\Application\Services\AiEvaluationService;

class EvaluateSubmissionJob implements ShouldQueue
{
    public function handle(AiEvaluationService $aiEvalService)
    {
        $submission = Submission::find($this->submissionId);
        
        try {
            // Call AI API
            $result = $this->callAiApi($submission);
            
            // Record success
            $aiEvalService->recordEvaluation($submission, [
                'provider' => 'openai',
                'model' => 'gpt-4',
                'score' => $result['score'],
                'feedback' => $result['feedback'],
                'rubric_scores' => $result['rubric_scores'],
                'metadata' => $result['metadata'],
            ]);
            
        } catch (\Exception $e) {
            // Record failure
            $aiEvalService->recordFailure($submission, $e->getMessage());
            
            throw $e; // Re-throw for job retry
        }
    }
}
```

---

## Database Queries

### Get Submissions with Latest Evaluation
```sql
SELECT 
    s.id,
    s.final_score,
    s.ai_feedback,
    ae.model,
    ae.prompt_version,
    ae.completed_at
FROM submissions s
LEFT JOIN ai_evaluations ae ON s.latest_ai_evaluation_id = ae.id
WHERE s.user_id = ?;
```

### Get Evaluation History
```sql
SELECT 
    ae.*
FROM ai_evaluations ae
WHERE ae.submission_id = ?
ORDER BY ae.created_at DESC;
```

### Track AI Provider Performance
```sql
SELECT 
    provider,
    model,
    AVG(score) as avg_score,
    COUNT(*) as total_evaluations,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failures
FROM ai_evaluations
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY provider, model;
```

---

## Migration Strategy

### For Existing Submissions

Existing submissions continue to work unchanged:
- `ai_score`, `ai_feedback`, `ai_metadata` columns still used
- `final_score` and `rubric_scores` available for new evaluations
- `effective_score` accessor provides backward compatibility

### Backfill (Optional)

To create ai_evaluations history from existing submissions:

```php
// One-time migration script
Submission::where('is_evaluated', true)
    ->chunk(100, function ($submissions) use ($service) {
        foreach ($submissions as $submission) {
            // Create historical record
            AiEvaluation::create([
                'submission_id' => $submission->id,
                'status' => 'succeeded',
                'score' => $submission->score,
                'feedback' => $submission->ai_feedback,
                'metadata' => $submission->ai_metadata,
                'completed_at' => $submission->evaluated_at,
                'created_at' => $submission->evaluated_at,
            ]);
        }
    });
```

---

## Benefits

✅ **Full Audit Trail** - Never lose evaluation history  
✅ **Fast UI Reads** - No joins for common queries  
✅ **Re-evaluation Support** - Compare different AI models/prompts  
✅ **Provider Tracking** - Know which AI service evaluated what  
✅ **Error Handling** - Track failed attempts with error messages  
✅ **Backward Compatible** - Existing code continues to work  
✅ **Future Proof** - Easy to add new AI providers

---

## Best Practices

1. **Always use `AiEvaluationService`** for recording evaluations (handles both tables)
2. **Use `effective_score`** accessor for displaying scores (handles final_score/score fallback)
3. **Check `latest_ai_evaluation_id`** for quick access to latest evaluation details
4. **Use `aiEvaluations` relationship** for full history
5. **Record failures** to track AI service reliability
6. **Include metadata** for debugging (tokens, response time, etc.)
