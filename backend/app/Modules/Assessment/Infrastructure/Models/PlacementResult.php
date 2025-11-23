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
        'user_id',
        'final_level',
        'final_domain',
        'overall_score',
        'details',
        'is_active',
    ];

    protected $casts = [
        'details' => 'array',
        'is_active' => 'boolean',
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
