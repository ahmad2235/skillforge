<?php

namespace App\Modules\Learning\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'title'       => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'type'        => 'sometimes|in:theory,coding,quiz,project',
            'difficulty'  => 'sometimes|integer|min:1|max:5',
            'max_score'   => 'sometimes|numeric|min:1',
            'is_active'   => 'sometimes|boolean',
            'metadata'    => 'sometimes|nullable|array',
        ];
    }
}
