<?php

namespace App\Modules\Assessment\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'level'         => 'required|in:beginner,intermediate,advanced',
            'domain'        => 'required|in:frontend,backend',
            'question_text' => 'required|string|max:1000',
            'type'          => 'required|in:mcq,code,short',
            'difficulty'    => 'required|integer|min:1|max:5',
            'metadata'      => 'nullable|array',
        ];
    }
}
