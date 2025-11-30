<?php

namespace App\Modules\Projects\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Team extends Model
{
    use HasFactory;

    protected $table = 'teams';

    protected $fillable = [
        'project_id',
        'owner_id',
        'name',
        'status',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    // المشروع المرتبط بهذا الفريق (إن وجد)
    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    // صاحب الفريق (ممكن يكون Business Owner أو Admin)
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    // أعضاء الفريق
    public function members()
    {
        return $this->hasMany(TeamMember::class, 'team_id');
    }

    // تعيينات هذا الفريق على المشاريع
    public function assignments()
    {
        return $this->hasMany(ProjectAssignment::class, 'team_id');
    }
}
