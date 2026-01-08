<?php

namespace App\Services\Recommendation\Repositories;

use App\Services\Recommendation\Contracts\StudentRepository;

// IMPORTANT:
// - Adjust the model namespace/table fields if your app differs.
use App\Models\Student;

class EloquentStudentRepository implements StudentRepository
{
    public function allNormalized(): array
    {
        return Student::query()
            ->get()
            ->map(function ($s) {
                // If you store avg_score_range as JSON in DB, cast it in the model or decode here.
                // If you store as two columns, build [min,max] here.

                $avgRange = $this->normalizeAvgScoreRange($s->avg_score_range ?? null);

                return [
                    'id' => (int)$s->id,
                    'name' => (string)($s->name ?? ''),
                    'domain' => (string)$s->domain,
                    'level' => (string)$s->level,
                    'activity_profile' => (string)($s->activity_profile ?? 'low-activity'),
                    'profile_settings' => [
                        'avg_score_range' => $avgRange,
                        'weight' => (float)($s->weight ?? 0.0),
                    ],
                ];
            })
            ->values()
            ->all();
    }

    private function normalizeAvgScoreRange($value): array
    {
        if (is_array($value) && count($value) === 2) return $value;

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded) && count($decoded) === 2) return $decoded;
        }

        // fallback
        return [0, 0];
    }
}
