<?php

namespace App\Modules\Identity\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required','email'],
            'password' => ['required','string'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        return parent::safe()->only(['email','password']);
    }
}
