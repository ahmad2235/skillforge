<?php

namespace App\Modules\Learning\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserRoadmapBlock extends Model
{
    use HasFactory;

    protected $table = 'user_roadmap_blocks';

    protected $fillable = [
        'user_id',
        'roadmap_block_id',
        'status',
        'started_at',
        'completed_at'
    ];

    protected $casts = [
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function block()
    {
        return $this->belongsTo(RoadmapBlock::class, 'roadmap_block_id');
    }
}
