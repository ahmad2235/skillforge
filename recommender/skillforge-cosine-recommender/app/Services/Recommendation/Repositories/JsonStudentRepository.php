<?php

namespace App\Services\Recommendation\Repositories;

use App\Services\Recommendation\Contracts\StudentRepository;

class JsonStudentRepository extends JsonBaseRepository implements StudentRepository
{
    public function allNormalized(): array
    {
        $out = [];
        foreach (($this->entities()['students'] ?? []) as $s) {
            $ps = $s['profile_settings'] ?? [];
            $out[] = [
                'id' => (int)($s['id'] ?? 0),
                'name' => (string)($s['name'] ?? ''),
                'domain' => (string)($s['domain'] ?? ''),
                'level' => (string)($s['level'] ?? 'beginner'),
                'activity_profile' => (string)($s['activity_profile'] ?? 'low-activity'),
                'profile_settings' => [
                    'avg_score_range' => $ps['avg_score_range'] ?? [0, 0],
                    'weight' => (float)($ps['weight'] ?? 0.0),
                ],
            ];
        }
        return $out;
    }
}
