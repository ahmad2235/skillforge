<?php

namespace App\Modules\Projects\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $table = 'projects';

    protected $fillable = [
        'owner_id',
        'title',
        'description',
        'domain',
        'required_level',
        'min_score_required',
        'status',
        'min_team_size',
        'max_team_size',
        'estimated_duration_weeks',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

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
}
