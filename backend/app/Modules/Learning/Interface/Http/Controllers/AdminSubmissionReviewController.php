<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Interface\Http\Requests\AdminReviewSubmissionRequest;
use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Http\JsonResponse;

class AdminSubmissionReviewController extends Controller
{
    public function review(AdminReviewSubmissionRequest $request, Submission $submission): JsonResponse
    {
        // Only update snapshot fields. Do NOT modify ai_evaluations history.
        $data = [];

        $data['status'] = $request->input('status');
        // Keep canonical evaluation_status in sync for admin overrides
        if ($request->input('status') === 'evaluated') {
            $data['evaluation_status'] = 'completed';
        } elseif ($request->input('status') === 'rejected') {
            $data['evaluation_status'] = 'failed';
        }

        if ($request->has('final_score')) {
            $data['final_score'] = $request->input('final_score');
        }

        if ($request->has('feedback')) {
            $data['feedback'] = $request->input('feedback');
        }

        if ($request->has('rubric_scores')) {
            $data['rubric_scores'] = $request->input('rubric_scores');
        }

        $data['evaluated_by'] = 'admin';
        $data['evaluated_at'] = now();

        $submission->update($data);

        return response()->json(['data' => $submission->refresh()]);
    }

    /**
     * Re-queue submission evaluation (admin-only).
     */
    public function reEvaluate(Submission $submission): JsonResponse
    {
        // Create queued AiEvaluation and set canonical evaluation_status to queued
        $evaluationRequestId = (string) \Illuminate\Support\Str::uuid();
        $ae = \App\Modules\Learning\Infrastructure\Models\AiEvaluation::create([
            'submission_id' => $submission->id,
            'evaluation_request_id' => $evaluationRequestId,
            'status' => 'queued',
            'semantic_status' => $submission::EVAL_QUEUED,
            'metadata' => ['source' => 'admin_requeue'],
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $submission->update(['evaluation_status' => 'queued', 'latest_ai_evaluation_id' => $ae->id]);
        \Illuminate\Support\Facades\Log::info("Admin requeued evaluation", ['submission_id' => $submission->id, 'evaluation_request_id' => $evaluationRequestId]);

        // Dispatch evaluation job (pass evaluationRequestId via job payload isn't currently supported, but we create the row so job can pick it up)
        dispatch(new \App\Jobs\EvaluateSubmissionJob($submission->id));

        return response()->json(['message' => 'Evaluation queued.', 'submission_id' => $submission->id, 'evaluation_request_id' => $evaluationRequestId]);
    }
}
