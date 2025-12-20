<?php

namespace App\Modules\Projects\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectMilestoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'        => 'sometimes|string|max:150',
            'description'  => 'sometimes|nullable|string',
            'order_index'  => 'sometimes|integer|min:1',
            'due_date'     => 'sometimes|nullable|date',
            'is_required'  => 'sometimes|boolean',
        ];
    }
}
