<?php

namespace App\Services\Recommendation\Contracts;

interface StudentRepository
{
    /**
     * Returns a list of normalized student arrays:
     * [
     *   'id' => int,
     *   'name' => string|null,
     *   'domain' => string,
     *   'level' => 'beginner'|'intermediate'|'advanced',
     *   'activity_profile' => 'active'|'semi-active'|'low-activity',
     *   'profile_settings' => [
     *        'avg_score_range' => [min,max], // ints 0..100
     *        'weight' => float               // 0..1
     *   ]
     * ]
     */
    public function allNormalized(): array;
}
