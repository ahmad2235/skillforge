<?php

namespace App\Modules\Learning\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tasks';

    protected $fillable = [
        'roadmap_block_id',
        'title',
        'description',
        'type',
        'difficulty',
        'max_score',
        'is_active',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
    ];

    protected static function newFactory()
    {
        return \Database\Factories\TaskFactory::new();
    }

    // البلوك الذي تنتمي له المهمة
    public function block()
    {
        return $this->belongsTo(RoadmapBlock::class, 'roadmap_block_id');
    }

    // submissions لهذا التاسك
    public function submissions()
    {
        return $this->hasMany(Submission::class, 'task_id');
    }
}
