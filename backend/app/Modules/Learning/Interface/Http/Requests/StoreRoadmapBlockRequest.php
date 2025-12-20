<?php

namespace App\Modules\Learning\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoadmapBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'level'           => 'required|in:beginner,intermediate,advanced',
            'domain'          => 'required|in:frontend,backend',
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'order_index'     => 'required|integer|min:1',
            'estimated_hours' => 'nullable|integer|min:1',
            'is_optional'     => 'boolean',
        ];
    }
}
