<?php

namespace App\Modules\Learning\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminReviewSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only admins may perform this request; RoleMiddleware enforces at route level,
        // but we ensure the current user is admin as a safety net.
        return $this->user() && $this->user()->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'in:evaluated,rejected'],
            'final_score' => ['nullable', 'numeric', 'between:0,100'],
            'feedback' => ['nullable', 'string'],
            'rubric_scores' => ['nullable', 'array'],
            'rubric_scores.*.criterion' => ['required_with:rubric_scores', 'string'],
            'rubric_scores.*.score' => ['required_with:rubric_scores', 'numeric', 'gte:0'],
            'rubric_scores.*.max_points' => ['required_with:rubric_scores', 'numeric', 'gt:0'],
        ];
    }
}
