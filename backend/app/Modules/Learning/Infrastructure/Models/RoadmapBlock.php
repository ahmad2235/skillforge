<?php

namespace App\Modules\Learning\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoadmapBlock extends Model
{
    use HasFactory;

    protected $table = 'roadmap_blocks';

    protected $fillable = [
        'level',
        'domain',
        'title',
        'description',
        'order_index',
        'estimated_hours',
        'is_optional'
    ];

    protected $casts = [
        'is_optional' => 'boolean',
    ];

    // كل المهام التابعة لهذا البلوك
    public function tasks()
    {
        return $this->hasMany(Task::class, 'roadmap_block_id');
    }

    // حالة الطالب في هذا البلوك
    public function userStatus()
    {
        return $this->hasMany(UserRoadmapBlock::class, 'roadmap_block_id');
    }
}
