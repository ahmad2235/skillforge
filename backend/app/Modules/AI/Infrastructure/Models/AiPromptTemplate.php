<?php

namespace App\Modules\AI\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiPromptTemplate extends Model
{
    use HasFactory;

    protected $table = 'ai_prompt_templates';

    protected $fillable = [
        'code',
        'type',
        'description',
        'template',
        'metadata',
        'is_active',
    ];

    protected $casts = [
        'metadata'  => 'array',
        'is_active' => 'boolean',
    ];

    // كل الـ logs التي استخدمت هذا الـ template
    public function logs()
    {
        return $this->hasMany(AiLog::class, 'prompt_template_id');
    }
}
