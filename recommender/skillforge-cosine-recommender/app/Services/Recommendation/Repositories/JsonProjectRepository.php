<?php

namespace App\Services\Recommendation\Repositories;

use App\Services\Recommendation\Contracts\ProjectRepository;

class JsonProjectRepository extends JsonBaseRepository implements ProjectRepository
{
    public function findNormalized(int $projectId): ?array
    {
        foreach (($this->entities()['projects'] ?? []) as $p) {
            if ((int)($p['id'] ?? 0) === $projectId) {
                return [
                    'id' => (int)($p['id'] ?? 0),
                    'status' => (string)($p['status'] ?? ''),
                    'domain' => (string)($p['domain'] ?? ''),
                    'required_level' => (string)($p['required_level'] ?? 'beginner'),
                    'complexity' => (string)($p['complexity'] ?? 'low'),
                ];
            }
        }
        return null;
    }

    public function allNormalized(): array
    {
        $out = [];
        foreach (($this->entities()['projects'] ?? []) as $p) {
            $out[] = [
                'id' => (int)($p['id'] ?? 0),
                'status' => (string)($p['status'] ?? ''),
                'domain' => (string)($p['domain'] ?? ''),
                'required_level' => (string)($p['required_level'] ?? 'beginner'),
                'complexity' => (string)($p['complexity'] ?? 'low'),
            ];
        }
        return $out;
    }
}
