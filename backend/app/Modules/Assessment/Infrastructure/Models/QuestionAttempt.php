<?php

namespace App\Modules\Assessment\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuestionAttempt extends Model
{
    use HasFactory;

    protected $table = 'question_attempts';

    protected $fillable = [
        'user_id',
        'placement_result_id',
        'question_id',
        // legacy/alternate fields
        'answer_text',
        'score',
        'ai_feedback',
        'metadata',
        // required canonical fields
        'answer',
        'is_correct',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    // الطالب صاحب الإجابة
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // تنتمي لأي نتيجة Placement
    public function placementResult()
    {
        return $this->belongsTo(PlacementResult::class, 'placement_result_id');
    }

    // تنتمي لأي سؤال
    public function question()
    {
        return $this->belongsTo(Question::class, 'question_id');
    }
}
