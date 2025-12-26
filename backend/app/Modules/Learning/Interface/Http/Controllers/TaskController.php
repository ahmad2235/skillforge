<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Application\Services\RoadmapService;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\Learning\Infrastructure\Models\Task;
use Illuminate\Http\Request;
use App\Modules\Learning\Interface\Http\Requests\SubmitTaskRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    public function __construct(
        private readonly RoadmapService $roadmapService
    ) {}

    /**
     * Get tasks for a specific block
     */
    public function listByBlock(int $blockId)
    {
        $user = Auth::user();

        $tasks = $this->roadmapService->getTasksForBlock($user, $blockId);

        return response()->json([
            'data' => $tasks,
        ]);
    }

    /**
     * Show a single task if it belongs to the student's roadmap (level + domain).
     */
    public function show(int $taskId)
    {
        $user = Auth::user();

        $task = Task::with('block')->findOrFail($taskId);

        // Ensure the task's block matches the student's level and domain
        $block = $task->block;
        if ($block->level !== $user->level || $block->domain !== $user->domain) {
            return response()->json(['message' => 'Forbidden. You do not have access to this task.'], 403);
        }

        return response()->json([
            'data' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'type' => $task->type,
                'difficulty' => $task->difficulty,
                'max_score' => $task->max_score ?? null,
                'metadata' => $task->metadata ?? [],
                'roadmap_block_id' => $task->roadmap_block_id,
            ],
        ]);
    }

    /**
     * Student submits a task solution
     */
    public function submit(SubmitTaskRequest $request, int $taskId)
    {
        $user = Auth::user();

        // Validate attachment requirement if task metadata requires it
        $task = Task::findOrFail($taskId);
        $requiresAttachment = $task->metadata['requires_attachment'] ?? false;
        $attachmentUrl = $request->input('attachment_url');

        if ($requiresAttachment && empty($attachmentUrl)) {
            return response()->json([
                'message' => 'Attachment is required for this task.',
                'errors' => ['attachment_url' => ['Attachment is required for this task.']],
            ], 422);
        }

        $result = $this->roadmapService->submitTask($user, $taskId, $request->validated());

        return response()->json([
            'message'    => 'Task submitted successfully.',
            'submission' => $result['submission'],
        ], 201);
    }

    /**
     * Get submission details with evaluation results
     */
    public function getSubmission(int $submissionId)
    {
        $user = Auth::user();

        $submission = Submission::with(['task', 'user'])
            ->findOrFail($submissionId);

        // Policy-based authorization
        $this->authorize('view', $submission);

        // Determine canonical evaluation_status directly from submission (authoritative)
        $latestAi = $submission->latestAiEvaluationResolved();
        $evaluationStatus = $submission->evaluation_status ?? null;

        $aiEvaluation = null;
        if ($latestAi) {
            $meta = (array) ($latestAi->metadata ?? []);

            $aiEvaluation = [
                'id' => $latestAi->id,
                'evaluation_request_id' => $latestAi->evaluation_request_id ?? null,
                'status' => $latestAi->status,
                'semantic_status' => $evaluationStatus, // mirror canonical state for auditing
                'score' => $latestAi->score !== null ? (int) round($latestAi->score) : null,
                'feedback' => $latestAi->feedback ?? $submission->ai_feedback ?? null,
                'meta' => [
                    'reason' => $meta['reason'] ?? null,
                    'total_score' => $meta['total_score'] ?? ($latestAi->score !== null ? (int) round($latestAi->score) : null),
                    'functional_score' => $meta['functional_score'] ?? ($meta['total_score'] ?? null),
                    'code_quality_score' => $meta['code_quality_score'] ?? null,
                    'rubric_scores' => $meta['rubric_scores'] ?? $latestAi->rubric_scores ?? null,
                ],
                // Expose category keys at top-level for UI compatibility
                'functional_score' => $meta['functional_score'] ?? ($meta['total_score'] ?? null),
                'code_quality_score' => $meta['code_quality_score'] ?? null,
                'started_at' => $latestAi->started_at?->toISOString() ?? null,
                'completed_at' => $latestAi->completed_at?->toISOString() ?? null,
            ];
        } else {
            // Fallback to submission snapshot if present (deprecation fallback)
            if ($submission->ai_feedback || $submission->ai_score) {
                $aiEvaluation = [
                    'id' => null,
                    'evaluation_request_id' => null,
                    'status' => $submission->is_evaluated ? 'succeeded' : 'running',
                    'semantic_status' => $submission->evaluation_status ?? ($submission->is_evaluated ? 'completed' : 'pending'),
                    'score' => $submission->ai_score !== null ? (int) round($submission->ai_score) : null,
                    'feedback' => $submission->ai_feedback ?? null,
                    'started_at' => $submission->evaluated_at?->toISOString() ?? $submission->submitted_at?->toISOString() ?? null,
                    'completed_at' => $submission->evaluated_at?->toISOString() ?? null,
                ];
            }
        }

        // Build minimal evaluation_debug (admin/advanced only in UI)
        $meta = (array) ($latestAi?->metadata ?? []);

        // Map canonical evaluation_status to a user-facing message (small, friendly mapping)
        $evaluationStatus = $submission->evaluation_status ?? null;
        switch ($evaluationStatus) {
            case 'queued':
                $userMessage = 'Evaluation queued — awaiting processing.';
                break;
            case 'evaluating':
                $userMessage = 'Evaluation in progress.';
                break;
            case 'completed':
                $userMessage = 'Evaluation complete.';
                break;
            case 'timed_out':
                $userMessage = 'Evaluation timed out. Try re-checking or request manual review.';
                break;
            case 'manual_review':
                $userMessage = 'Requires manual review by staff.';
                break;
            case 'failed':
                $userMessage = 'Automatic evaluation failed. Please request a manual review.';
                break;
            case 'skipped':
                $userMessage = 'Auto evaluation skipped.';
                break;
            default:
                $userMessage = null;
        }

        $evaluationDebug = [
            'has_ai_evaluation' => (bool) $latestAi,
            'latest_ai_evaluation_id' => $latestAi?->id ?? null,
            'latest_ai_evaluation_updated_at' => $latestAi?->completed_at?->toISOString() ?? $latestAi?->created_at?->toISOString() ?? null,
            'last_job_attempted_at' => $latestAi?->started_at?->toISOString() ?? null,
            'evaluator_elapsed_ms' => $meta['evaluator_elapsed_ms'] ?? null,
            'evaluator_http_status' => $meta['evaluator_http_status'] ?? null,
            'evaluator_timeout_seconds' => $meta['evaluator_timeout_seconds'] ?? config('services.evaluator.timeout'),
            'message' => $latestAi?->error_message ?? ($meta['reason'] ?? null),
        ];

        return response()->json([
            'data' => [
                'id'          => $submission->id,
                'task_id'     => $submission->task_id,
                'answer_text' => $submission->answer_text,
                'attachment_url' => $submission->attachment_url,
                'status'      => $submission->status,
                'score'       => $submission->score,
                'ai_score'    => $submission->ai_score,
                'ai_feedback' => $submission->ai_feedback,
                'ai_metadata' => $submission->ai_metadata,
                'final_score' => $submission->final_score ?? null,
                'is_evaluated' => $submission->is_evaluated,
                'submitted_at' => $submission->submitted_at,
                'evaluated_at' => $submission->evaluated_at,
                'task'        => $submission->task,
                'evaluation_status' => $submission->evaluation_status,
                'user_message' => $userMessage,
                'ai_evaluation' => $aiEvaluation,
                'evaluation_debug' => $evaluationDebug,
            ],
        ]);
    }

    // Student-triggered re-evaluate (rate-limited and ownership-checked)
    public function reEvaluate(Submission $submission)
    {
        $this->authorize('view', $submission);

        // create queued ai_evaluation and mark submission as queued
        $evaluationRequestId = (string) \Illuminate\Support\Str::uuid();
        $ae = \App\Modules\Learning\Infrastructure\Models\AiEvaluation::create([
            'submission_id' => $submission->id,
            'evaluation_request_id' => $evaluationRequestId,
            'status' => 'queued',
            'semantic_status' => $submission::EVAL_QUEUED,
            'metadata' => ['source' => 'student_requeue'],
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $submission->update(['evaluation_status' => 'queued', 'latest_ai_evaluation_id' => $ae->id]);
        \Illuminate\Support\Facades\Log::info('Student requeued evaluation', ['submission_id' => $submission->id, 'evaluation_request_id' => $evaluationRequestId]);

        dispatch(new \App\Jobs\EvaluateSubmissionJob($submission->id));

        return response()->json(['message' => 'Evaluation queued.', 'submission_id' => $submission->id, 'evaluation_request_id' => $evaluationRequestId], 202);
    }

    // Map raw ai evaluation + submission snapshot -> a semantic status string + user-facing message
    private function mapSemanticStatus(Submission $submission, $latestAi = null): array
    {
        $semantic = 'pending';
        $message = 'Evaluation in progress';

        if ($latestAi) {
            $raw = $latestAi->status;
            $meta = (array) ($latestAi->metadata ?? []);
            $outcome = $meta['evaluation_outcome'] ?? null;

            // Priority rules with strict ordering to avoid contradictions:
            // 1) If raw status is queued/running -> pending (this must override metadata)
            if (in_array($raw, ['queued', 'running'], true)) {
                $semantic = 'pending';
                $message = 'Evaluation in progress';
            } elseif ($raw === 'succeeded') {
                // 2) succeeded -> completed
                $semantic = 'completed';
                $message = 'Evaluation complete';
            } elseif ($raw === 'failed') {
                // 3) failed -> consult metadata outcome
                if ($outcome === 'manual_review') {
                    $semantic = 'manual_review';
                    if (($meta['reason'] ?? null) === 'evaluator_timeout') {
                        $message = 'Evaluation timed out. Please try again later or ask an admin to review.';
                    } elseif (($meta['reason'] ?? null) === 'ai_disabled') {
                        $message = 'Needs manual review (AI disabled)';
                    } else {
                        $message = 'Needs manual review';
                    }
                } elseif ($outcome === 'skipped') {
                    $semantic = 'skipped';
                    $message = 'Auto evaluation skipped';
                } else {
                    $semantic = 'failed';
                    $message = 'Evaluation failed — needs attention';
                }
            } else {
                // 4) If metadata explicitly says manual_review/skipped even if raw is non-failed,
                // treat those as authoritative (covers legacy or odd states)
                if (in_array($outcome, ['manual_review', 'skipped'], true)) {
                    if ($outcome === 'manual_review') {
                        $semantic = 'manual_review';
                        $message = 'Needs manual review';
                    } else {
                        $semantic = 'skipped';
                        $message = 'Auto evaluation skipped';
                    }
                } else {
                    // Default to pending
                    $semantic = 'pending';
                    $message = 'Evaluation in progress';
                }
            }
        } else {
            // Fallback to canonical evaluation_status when no latest ai_evaluation exists
            if ($submission->evaluation_status === Submission::EVAL_MANUAL_REVIEW) {
                $semantic = 'manual_review';
                $message = 'Needs manual review';
            } elseif ($submission->is_evaluated) {
                $semantic = 'completed';
                $message = 'Evaluation complete';
            } elseif ($submission->evaluation_status === Submission::EVAL_EVALUATING) {
                $semantic = 'pending';
                $message = 'Evaluation in progress';
            }
        }

        return [$semantic, $message];
    }
}

