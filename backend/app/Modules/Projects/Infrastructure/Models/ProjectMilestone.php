<?php

namespace App\Modules\Projects\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectMilestone extends Model
{
    use HasFactory;

    protected $table = 'project_milestones';

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'order_index',
        'due_date',
        'is_required',
        'domain',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'due_date' => 'date',
    ];

    protected static function newFactory()
    {
        return \Database\Factories\ProjectMilestoneFactory::new();
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function submissions()
    {
        return $this->hasMany(ProjectMilestoneSubmission::class, 'project_milestone_id');
    }
}
