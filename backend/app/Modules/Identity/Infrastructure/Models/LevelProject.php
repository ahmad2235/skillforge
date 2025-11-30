<?php

namespace App\Modules\Identity\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LevelProject extends Model
{
    use HasFactory;

    protected $table = 'level_projects';

    protected $fillable = [
        'level',
        'title',
        'brief',
    ];

    protected $casts = [
        'rubric' => 'array',
    ];

    // لو حبيت تربطه بالطلاب اللي عندهم current_level_project_id
    public function users()
    {
        return $this->hasMany(\App\Models\User::class, 'current_level_project_id');
    }
}
