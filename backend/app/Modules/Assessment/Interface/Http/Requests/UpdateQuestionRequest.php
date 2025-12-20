<?php

namespace App\Modules\Assessment\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'level'         => 'sometimes|in:beginner,intermediate,advanced',
            'domain'        => 'sometimes|in:frontend,backend',
            'question_text' => 'sometimes|string|max:1000',
            'type'          => 'sometimes|in:mcq,code,short',
            'difficulty'    => 'sometimes|integer|min:1|max:5',
            'metadata'      => 'sometimes|nullable|array',
        ];
    }
}
