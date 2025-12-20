<?php

namespace App\Modules\Projects\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectMilestoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'        => 'required|string|max:150',
            'description'  => 'nullable|string',
            'order_index'  => 'nullable|integer|min:1',
            'due_date'     => 'nullable|date',
            'is_required'  => 'nullable|boolean',
        ];
    }
}
