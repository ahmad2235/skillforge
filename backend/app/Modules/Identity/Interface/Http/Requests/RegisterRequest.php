<?php

namespace App\Modules\Identity\Interface\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'     => ['required','string','max:100'],
            'email'    => ['required','email','unique:users,email'],
            'password' => ['required','string','min:8'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        // Strict allow-list
        return parent::safe()->only(['name','email','password']);
    }
}
