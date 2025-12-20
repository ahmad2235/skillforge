<?php

namespace App\Modules\Projects\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitProjectMilestoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'answer_text'   => 'nullable|string|required_without:attachment_url',
            'attachment_url'=> [
                'nullable',
                'url',
                'max:2048',
                'regex:/^https:\\/\\//i',
                'not_regex:/^https?:\\/\\/(localhost|127\\.0\\.0\\.1|10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[0-1])\\.)/i',
                'required_without:answer_text',
            ],
        ];
    }
}
