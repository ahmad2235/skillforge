<?php

namespace App\Modules\Projects\Infrastructure\Models;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'projects';

    protected $fillable = [
        'owner_id',
        'title',
        'description',
        'requirements_pdf_path',
        'domain',
        'required_level',
        'complexity',  // Added for recommender system
        'min_score_required',
        'status',
        'min_team_size',
        'max_team_size',
        'estimated_duration_weeks',
        'metadata',
        'admin_note',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Default values for new projects
     */
    protected $attributes = [
        'complexity' => 'low',
        'status' => 'open',
    ];

    protected static function newFactory()
    {
        return \Database\Factories\ProjectFactory::new();
    }

    // صاحب المشروع (Business Owner)
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    // الفرق المرتبطة بهذا المشروع
    public function teams()
    {
        return $this->hasMany(Team::class, 'project_id');
    }

    // تعيينات الطلاب/الفرق على هذا المشروع
    public function assignments()
    {
        return $this->hasMany(ProjectAssignment::class, 'project_id');
    }

    // المشاريع الظاهرة في بورتفوليو الطلاب المرتبطة بهذا المشروع
    public function portfolios()
    {
        return $this->hasMany(
            \App\Modules\Gamification\Infrastructure\Models\Portfolio::class,
            'project_id'
        );
    }

    public function milestones()
    {
        return $this->hasMany(ProjectMilestone::class, 'project_id');
    }

    /**
     * Get the adjusted required level considering complexity.
     * 
     * This is used by the recommender system to ensure students
     * are matched to appropriately challenging projects.
     *
     * @return string 'beginner', 'intermediate', or 'advanced'
     */
    public function getAdjustedRequiredLevelAttribute(): string
    {
        $levelOrder = ['beginner' => 0, 'intermediate' => 1, 'advanced' => 2];
        $complexityMinLevel = [
            'low' => 'beginner',
            'medium' => 'intermediate',
            'high' => 'advanced',
        ];

        $requiredLevel = $this->required_level ?? 'beginner';
        $complexity = $this->complexity ?? 'low';
        $complexityMin = $complexityMinLevel[$complexity] ?? 'beginner';

        $reqOrder = $levelOrder[$requiredLevel] ?? 0;
        $compMinOrder = $levelOrder[$complexityMin] ?? 0;

        return $reqOrder >= $compMinOrder ? $requiredLevel : $complexityMin;
    }
}
