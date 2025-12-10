<?php

namespace App\Modules\Learning\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

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
