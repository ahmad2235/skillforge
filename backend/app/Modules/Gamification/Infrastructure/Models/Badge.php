<?php

namespace App\Modules\Gamification\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Badge extends Model
{
    use HasFactory;

    protected $table = 'badges';

    protected $fillable = [
        'code',
        'name',
        'description',
        'level',
        'domain',
        'criteria',
        'icon_url',
    ];

    protected $casts = [
        'criteria' => 'array',
    ];

    // علاقة: وسام واحد له عدة user_badges (طلاب حصلوا عليه)
    public function userBadges()
    {
        return $this->hasMany(UserBadge::class, 'badge_id');
    }

    // علاقة مختصرة: الوصول للمستخدمين عبر جدول pivot user_badges
    public function users()
    {
        return $this->belongsToMany(
            \App\Models\User::class,
            'user_badges',
            'badge_id',
            'user_id'
        );
    }
}
