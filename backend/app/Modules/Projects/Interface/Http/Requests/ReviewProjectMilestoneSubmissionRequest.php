<?php

namespace App\Modules\Projects\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewProjectMilestoneSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'   => 'required|in:approved,rejected,reviewed',
            'feedback' => 'nullable|string',
        ];
    }
}
