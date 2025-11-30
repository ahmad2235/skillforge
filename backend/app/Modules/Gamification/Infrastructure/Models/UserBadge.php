<?php

namespace App\Modules\Gamification\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserBadge extends Model
{
    use HasFactory;

    protected $table = 'user_badges';

    protected $fillable = [
        'user_id',
        'badge_id',
        'awarded_at',
        'source',
        'metadata',
    ];

    protected $casts = [
        'awarded_at' => 'datetime',
        'metadata'   => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function badge()
    {
        return $this->belongsTo(Badge::class, 'badge_id');
    }
}
