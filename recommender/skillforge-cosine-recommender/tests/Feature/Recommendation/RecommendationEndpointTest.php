<?php

namespace Tests\Feature\Recommendation;

use Tests\TestCase;

class RecommendationEndpointTest extends TestCase
{
    public function test_candidates_endpoint_in_json_mode_returns_shape(): void
    {
        // Uses demo JSON repository - does not require DB
        $response = $this->getJson('/api/projects/13/candidates?source=json&top_n=7');

        // If project 13 doesn't exist in your demo file, adjust the ID in the test.
        $response->assertStatus(200);

        $response->assertJsonStructure([
            'project_id',
            'top_n',
            'semi_active_min_similarity',
            'candidates' => [
                '*' => [
                    'student_id',
                    'name',
                    'domain',
                    'level',
                    'activity_profile',
                    'similarity',
                ]
            ]
        ]);
    }
}
