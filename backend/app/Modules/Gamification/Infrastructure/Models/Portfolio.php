<?php

namespace App\Modules\Gamification\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Portfolio extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'portfolios';

   protected $fillable = [
        'user_id',
        'level_project_id',  // لمشاريع الـ learning (level_projects)
        'project_id',        // لمشاريع الـ business owners
        'title',
        'description',
        'github_url',
        'live_demo_url',
        'score',
        'feedback',
        'is_public',
        'metadata',
    ];
    protected $casts = [
        'score'     => 'decimal:2',
        'is_public' => 'boolean',
        'metadata'  => 'array',
    ];

    // صاحب البورتفوليو (الطالب)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // لو المشروع تابع لمشروع مستوى (level_projects)
    public function levelProject()
    {
        // نستخدم string عشان ما نكسر التحميل قبل ما نعرّف الموديل
        return $this->belongsTo(
            'App\Modules\Learning\Infrastructure\Models\LevelProject',
            'level_project_id'
        );
    }

    // لو المشروع تابع لمشروع حقيقي من أصحاب الأعمال
    public function project()
    {
        return $this->belongsTo(
            'App\Modules\Projects\Infrastructure\Models\Project',
            'project_id'
        );
    }
}
