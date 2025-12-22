<?php

namespace App\Modules\Learning\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Skill model for Phase 9 Skills & Rubrics.
 *
 * Represents a discrete skill that can be linked to tasks.
 */
class Skill extends Model
{
    use HasFactory;

    protected $table = 'skills';

    protected $fillable = [
        'code',
        'name',
        'description',
        'domain',
        'level',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Tasks that teach/assess this skill.
     */
    public function tasks()
    {
        return $this->hasMany(Task::class, 'skill_id');
    }

    /**
     * Scope: filter by domain.
     */
    public function scopeForDomain($query, string $domain)
    {
        return $query->where('domain', $domain);
    }

    /**
     * Scope: filter by level.
     */
    public function scopeForLevel($query, string $level)
    {
        return $query->where('level', $level);
    }

    /**
     * Scope: only active skills.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
