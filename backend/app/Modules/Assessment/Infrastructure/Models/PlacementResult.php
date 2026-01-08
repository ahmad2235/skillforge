<?php

namespace App\Modules\Assessment\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlacementResult extends Model
{
    use HasFactory;

    protected $table = 'placement_results';

    protected $fillable = [
        // existing fields
        'user_id',
        'final_level',
        'final_domain',
        'overall_score',
        'details',
        'is_active',
        // async status fields
        'status',
        'evaluation_started_at',
        'evaluation_completed_at',
        'pending_answers',
        // required canonical fields
        'score',
        'suggested_level',
        'suggested_domain',
        'metadata',
    ];

    protected $casts = [
        'details' => 'array',
        'is_active' => 'boolean',
        'metadata' => 'array',
        'pending_answers' => 'array',
        'evaluation_started_at' => 'datetime',
        'evaluation_completed_at' => 'datetime',
    ];

    // الطالب صاحب النتيجة
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // كل المحاولات (الأسئلة) اللي ضمن هذا الـ placement
    public function questionAttempts()
    {
        return $this->hasMany(QuestionAttempt::class, 'placement_result_id');
    }
}
