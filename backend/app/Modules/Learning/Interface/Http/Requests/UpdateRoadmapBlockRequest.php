<?php

namespace App\Modules\Learning\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoadmapBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'level'           => 'sometimes|in:beginner,intermediate,advanced',
            'domain'          => 'sometimes|in:frontend,backend',
            'title'           => 'sometimes|string|max:255',
            'description'     => 'sometimes|nullable|string',
            'order_index'     => 'sometimes|integer|min:1',
            'estimated_hours' => 'sometimes|nullable|integer|min:1',
            'is_optional'     => 'sometimes|boolean',
        ];
    }
}
