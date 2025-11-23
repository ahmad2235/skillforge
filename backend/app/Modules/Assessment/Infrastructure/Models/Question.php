<?php

namespace App\Modules\Assessment\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $table = 'questions';

    protected $fillable = [
        'level',
        'domain',
        'question_text',
        'type',
        'difficulty',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    // العلاقات:

    // سؤال واحد له محاولات كثيرة
    public function attempts()
    {
        return $this->hasMany(QuestionAttempt::class, 'question_id');
    }
}
