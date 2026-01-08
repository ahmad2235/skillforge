<?php

namespace App\Services\Recommendation\Engines;

use App\Services\Recommendation\Contracts\ProjectRepository;
use App\Services\Recommendation\Contracts\StudentRepository;

class CosineRecommender
{
    public function __construct(
        private ProjectRepository $projectsRepo,
        private StudentRepository $studentsRepo,
    ) {}

    public function recommend(array $project, int $topN = 7, float $semiActiveMinSimilarity = 0.80): array
    {
        $students = $this->studentsRepo->allNormalized();

        // Domain vocab for one-hot
        $domainVocab = $this->collectDomains(
            projects: $this->projectsRepo->allNormalized(),
            students: $students
        );

        $pv = Vectorizer::projectVector($project, $domainVocab);

        $results = [];
        foreach ($students as $s) {
            if (!Eligibility::eligible($s, $project)) {
                continue;
            }

            $sv = Vectorizer::studentVector($s, $domainVocab);
            $sim = Similarity::cosine($sv, $pv);

            $activity = $s['activity_profile'] ?? 'low-activity';
            if ($activity === 'semi-active' && $sim < $semiActiveMinSimilarity) {
                continue;
            }

            $results[] = [
                'student_id' => $s['id'] ?? null,
                'name' => $s['name'] ?? null,
                'domain' => $s['domain'] ?? null,
                'level' => $s['level'] ?? null,
                'activity_profile' => $activity,
                'similarity' => round($sim, 4),
            ];
        }

        usort($results, function ($a, $b) {
            // sort by similarity desc; tie-break active > semi-active
            if ($a['similarity'] === $b['similarity']) {
                $ar = ($a['activity_profile'] ?? '') === 'active' ? 1 : 0;
                $br = ($b['activity_profile'] ?? '') === 'active' ? 1 : 0;
                return $br <=> $ar;
            }
            return $b['similarity'] <=> $a['similarity'];
        });

        return array_slice($results, 0, $topN);
    }

    private function collectDomains(array $projects, array $students): array
    {
        $set = [];
        foreach ($projects as $p) {
            $d = $p['domain'] ?? null;
            if ($d) $set[$d] = true;
        }
        foreach ($students as $s) {
            $d = $s['domain'] ?? null;
            if ($d) $set[$d] = true;
        }
        $vocab = array_keys($set);
        sort($vocab);
        return $vocab;
    }
}
