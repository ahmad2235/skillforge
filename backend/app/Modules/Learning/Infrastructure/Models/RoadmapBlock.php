<?php

namespace App\Modules\Learning\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RoadmapBlock extends Model
{
    use HasFactory, SoftDeletes;

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

    protected static function newFactory()
    {
        return \Database\Factories\RoadmapBlockFactory::new();
    }

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
