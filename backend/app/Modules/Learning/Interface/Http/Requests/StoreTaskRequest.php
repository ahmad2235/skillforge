<?php

namespace App\Modules\Learning\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'type'        => 'required|in:theory,coding,quiz,project',
            'difficulty'  => 'required|integer|min:1|max:5',
            'max_score'   => 'required|numeric|min:1',
            'is_active'   => 'boolean',
            'metadata'    => 'nullable|array',
        ];
    }
}
