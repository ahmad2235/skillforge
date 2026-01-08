<?php

namespace App\Services\Recommendation\Contracts;

interface ProjectRepository
{
    /**
     * Returns a normalized project array:
     * [
     *   'id' => int,
     *   'status' => 'open'|'closed'|...,
     *   'domain' => string,
     *   'required_level' => 'beginner'|'intermediate'|'advanced',
     *   'complexity' => 'low'|'medium'|'high'
     * ]
     */
    public function findNormalized(int $projectId): ?array;

    /**
     * Return all projects normalized (used by JSON domain vocab builder).
     */
    public function allNormalized(): array;
}
