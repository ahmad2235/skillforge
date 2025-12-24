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
        // Dispatch evaluation job
        dispatch(new \App\Jobs\EvaluateSubmissionJob($submission->id));

        return response()->json(['message' => 'Evaluation queued.', 'submission_id' => $submission->id]);
    }
}
