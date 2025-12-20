<?php

namespace App\Modules\Learning\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum + role enforced at route level
    }

    public function rules(): array
    {
        return [
            'answer_text'    => ['nullable','string'],
            'attachment_url' => [
                'nullable',
                'url',
                'max:2048',
                'regex:/^https:\\/\\//i',
                'not_regex:/^https?:\\/\\/(localhost|127\\.0\\.0\\.1|10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[0-1])\\.)/i',
            ],
            'run_status'     => ['nullable','string'],
            'known_issues'   => ['nullable','string'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        return parent::safe()->only(['answer_text','attachment_url','run_status','known_issues']);
    }
}
