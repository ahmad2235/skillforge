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
            'attachment_url' => ['nullable','url'],
            'run_status'     => ['nullable','string'],
            'known_issues'   => ['nullable','string'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        return parent::safe()->only(['answer_text','attachment_url','run_status','known_issues']);
    }
}
