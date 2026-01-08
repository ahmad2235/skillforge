<?php

namespace App\Modules\Projects\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAdminProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'         => 'sometimes|in:draft,open,in_progress,completed,cancelled',
            'required_level' => 'sometimes|nullable|in:beginner,intermediate,advanced',
            'domain'         => 'sometimes|in:frontend,backend,fullstack',
            'admin_note'     => 'sometimes|nullable|string',
        ];
    }
}
