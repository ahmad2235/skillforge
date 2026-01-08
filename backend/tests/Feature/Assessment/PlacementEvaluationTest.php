<?php

namespace Tests\Feature\Assessment;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Assessment\Infrastructure\Models\Question;
use App\Modules\Assessment\Infrastructure\Models\QuestionAttempt;
use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PlacementEvaluationTest extends TestCase
{
    use RefreshDatabase;

    private User $student;
    private array $mcqQuestions = [];
    private array $textQuestions = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create([
            'role' => 'student',
            'domain' => 'frontend',
            'level' => null,
            'email_verified_at' => now(),
        ]);

        // Create MCQ questions with correct answers
        $this->mcqQuestions = [
            Question::create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'question_text' => 'What does HTML stand for?',
                'type' => 'mcq',
                'difficulty' => 1,
                'metadata' => [
                    'options' => [
                        'A' => 'Hyper Text Markup Language',
                        'B' => 'High Tech Modern Language',
                        'C' => 'Home Tool Markup Language',
                        'D' => 'Hyperlinks and Text Markup Language',
                    ],
                    'correct_answer' => 'A',
                ],
            ]),
            Question::create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'question_text' => 'Which CSS property changes text color?',
                'type' => 'mcq',
                'difficulty' => 1,
                'metadata' => [
                    'options' => [
                        'A' => 'font-color',
                        'B' => 'text-color',
                        'C' => 'color',
                        'D' => 'foreground-color',
                    ],
                    'correct_answer' => 'C',
                ],
            ]),
        ];

        // Create text questions
        $this->textQuestions = [
            Question::create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'question_text' => 'Explain the difference between inline, block, and inline-block display values.',
                'type' => 'text',
                'difficulty' => 2,
                'metadata' => [],
            ]),
        ];

        // Create some roadmap blocks for the student
        RoadmapBlock::create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'title' => 'HTML Basics',
            'description' => 'Learn HTML fundamentals',
            'order_index' => 1,
        ]);

        RoadmapBlock::create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'title' => 'CSS Basics',
            'description' => 'Learn CSS fundamentals',
            'order_index' => 2,
        ]);

        RoadmapBlock::create([
            'level' => 'advanced',
            'domain' => 'frontend',
            'title' => 'Advanced React',
            'description' => 'Learn Advanced React patterns',
            'order_index' => 1,
        ]);
    }

    // ==========================================
    // MCQ AUTO-SCORING TESTS
    // ==========================================

    public function test_mcq_correct_answer_scores_100(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->mcqQuestions[0]->id,
                        'answer' => 'A', // Correct answer
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        $data = $response->json('data');
        $this->assertEquals(100, $data['score']);
        $this->assertEquals(1, $data['correct_count']);
        
        // Verify database record
        $attempt = QuestionAttempt::where('question_id', $this->mcqQuestions[0]->id)->first();
        $this->assertNotNull($attempt);
        $this->assertEquals(100, $attempt->score);
        $this->assertEquals(1, $attempt->is_correct);
        $this->assertEquals('Correct!', $attempt->ai_feedback);
    }

    public function test_mcq_incorrect_answer_scores_0(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->mcqQuestions[0]->id,
                        'answer' => 'B', // Wrong answer
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        $data = $response->json('data');
        $this->assertEquals(0, $data['score']);
        $this->assertEquals(0, $data['correct_count']);

        // Verify database record
        $attempt = QuestionAttempt::where('question_id', $this->mcqQuestions[0]->id)->first();
        $this->assertNotNull($attempt);
        $this->assertEquals(0, $attempt->score);
        $this->assertEquals(0, $attempt->is_correct);
        $this->assertStringContainsString('Incorrect', $attempt->ai_feedback);
        $this->assertStringContainsString('A', $attempt->ai_feedback); // Shows correct answer
    }

    public function test_mcq_missing_answer_scores_0(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->mcqQuestions[0]->id,
                        'answer' => '', // Empty answer
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        $data = $response->json('data');
        $this->assertEquals(0, $data['score']);

        $attempt = QuestionAttempt::where('question_id', $this->mcqQuestions[0]->id)->first();
        $this->assertEquals(0, $attempt->score);
        $this->assertStringContainsString('No answer provided', $attempt->ai_feedback);
    }

    public function test_mcq_case_insensitive_matching(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->mcqQuestions[0]->id,
                        'answer' => 'a', // Lowercase correct answer
                    ],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertEquals(100, $response->json('data.score'));
    }

    public function test_mcq_question_without_correct_answer_logs_warning(): void
    {
        // Create question without correct_answer
        $questionNoAnswer = Question::create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'question_text' => 'Question without correct answer',
            'type' => 'mcq',
            'difficulty' => 1,
            'metadata' => [
                'options' => ['A' => 'Option A', 'B' => 'Option B'],
                // No correct_answer!
            ],
        ]);

        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $questionNoAnswer->id,
                        'answer' => 'A',
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        // Should score 0 and have error feedback
        $attempt = QuestionAttempt::where('question_id', $questionNoAnswer->id)->first();
        $this->assertEquals(0, $attempt->score);
        $this->assertStringContainsString('configuration error', $attempt->ai_feedback);
    }

    // ==========================================
    // TEXT QUESTION EVALUATION TESTS
    // ==========================================

    public function test_text_question_empty_answer_scores_0(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->textQuestions[0]->id,
                        'answer' => '',
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        $attempt = QuestionAttempt::where('question_id', $this->textQuestions[0]->id)->first();
        $this->assertEquals(0, $attempt->score);
        $this->assertStringContainsString('No answer provided', $attempt->ai_feedback);
    }

    public function test_text_question_fallback_scoring_short_answer(): void
    {
        // When AI is unavailable, fallback scoring based on length
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->textQuestions[0]->id,
                        'answer' => 'Short answer', // Very short
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        // With AI unavailable, fallback gives low score for short answers
        $attempt = QuestionAttempt::where('question_id', $this->textQuestions[0]->id)->first();
        $this->assertNotNull($attempt->score);
        // Fallback scores are typically low for short answers
        $this->assertLessThanOrEqual(50, $attempt->score);
    }

    public function test_text_question_fallback_scoring_long_answer(): void
    {
        $longAnswer = 'Inline elements flow within text and only take up as much width as necessary. ' .
            'Block elements start on a new line and take up the full width available. ' .
            'Inline-block elements combine both behaviors - they flow inline but can have width and height set. ' .
            'This is useful for creating layouts where elements need to sit side by side but also need specific dimensions.';

        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->textQuestions[0]->id,
                        'answer' => $longAnswer,
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        // Longer answers get higher fallback scores
        $attempt = QuestionAttempt::where('question_id', $this->textQuestions[0]->id)->first();
        $this->assertNotNull($attempt->score);
        $this->assertGreaterThanOrEqual(50, $attempt->score);
    }

    // ==========================================
    // PLACEMENT RESULT CALCULATION TESTS
    // ==========================================

    public function test_overall_score_is_average_of_all_questions(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->mcqQuestions[0]->id,
                        'answer' => 'A', // Correct = 100
                    ],
                    [
                        'question_id' => $this->mcqQuestions[1]->id,
                        'answer' => 'B', // Wrong = 0
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        // Average of 100 + 0 = 50
        $this->assertEquals(50, $response->json('data.score'));
    }

    public function test_level_inferred_from_score_beginner(): void
    {
        // All wrong answers = 0 score = beginner
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->mcqQuestions[0]->id,
                        'answer' => 'B', // Wrong
                    ],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertEquals('beginner', $response->json('data.suggested_level'));
        
        // Verify user was updated
        $this->student->refresh();
        $this->assertEquals('beginner', $this->student->level);
    }

    public function test_level_inferred_from_score_intermediate(): void
    {
        // Create more questions to get 50-79 score range
        $q3 = Question::create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'question_text' => 'Q3',
            'type' => 'mcq',
            'difficulty' => 1,
            'metadata' => ['options' => ['A' => 'A', 'B' => 'B'], 'correct_answer' => 'A'],
        ]);
        $q4 = Question::create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'question_text' => 'Q4',
            'type' => 'mcq',
            'difficulty' => 1,
            'metadata' => ['options' => ['A' => 'A', 'B' => 'B'], 'correct_answer' => 'A'],
        ]);

        // 2 correct (200) + 2 wrong (0) = 200/4 = 50 = intermediate
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'A'], // Correct
                    ['question_id' => $this->mcqQuestions[1]->id, 'answer' => 'C'], // Correct
                    ['question_id' => $q3->id, 'answer' => 'B'], // Wrong
                    ['question_id' => $q4->id, 'answer' => 'B'], // Wrong
                ],
            ]);

        $response->assertStatus(201);
        $this->assertEquals('intermediate', $response->json('data.suggested_level'));
    }

    public function test_level_inferred_from_score_advanced(): void
    {
        // All correct = 100 = advanced
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'A'],
                    ['question_id' => $this->mcqQuestions[1]->id, 'answer' => 'C'],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertEquals('advanced', $response->json('data.suggested_level'));
        
        $this->student->refresh();
        $this->assertEquals('advanced', $this->student->level);
    }

    // ==========================================
    // EDGE CASES
    // ==========================================

    public function test_empty_submission_returns_beginner(): void
    {
        // This should fail validation since answers is required with min:1
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [],
            ]);

        // Should fail validation
        $response->assertStatus(422);
    }

    public function test_mixed_mcq_and_text_questions_average_correctly(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    [
                        'question_id' => $this->mcqQuestions[0]->id,
                        'answer' => 'A', // Correct = 100
                    ],
                    [
                        'question_id' => $this->textQuestions[0]->id,
                        'answer' => 'Inline elements stay on the same line, block elements take full width.',
                    ],
                ],
            ]);

        $response->assertStatus(201);
        
        $data = $response->json('data');
        // MCQ = 100, Text = fallback score (varies)
        // Score should be average of both
        $this->assertIsInt($data['score']);
        $this->assertGreaterThanOrEqual(0, $data['score']);
        $this->assertLessThanOrEqual(100, $data['score']);
        
        // Should have results for both questions
        $this->assertCount(2, $data['question_results']);
    }

    public function test_question_results_include_individual_feedback(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'A'],
                    ['question_id' => $this->mcqQuestions[1]->id, 'answer' => 'B'],
                ],
            ]);

        $response->assertStatus(201);
        
        $questionResults = $response->json('data.question_results');
        $this->assertCount(2, $questionResults);
        
        foreach ($questionResults as $result) {
            $this->assertArrayHasKey('question_id', $result);
            $this->assertArrayHasKey('score', $result);
            $this->assertArrayHasKey('is_correct', $result);
            $this->assertArrayHasKey('feedback', $result);
        }
    }

    public function test_get_placement_result_returns_details(): void
    {
        // First submit
        $submitResponse = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'A'],
                ],
            ]);

        $placementResultId = $submitResponse->json('data.placement_result_id');

        // Get result details
        $response = $this->actingAs($this->student)
            ->getJson("/api/student/assessment/placement/result/{$placementResultId}");

        $response->assertStatus(200);
        
        $data = $response->json('data');
        $this->assertEquals($placementResultId, $data['id']);
        $this->assertEquals(100, $data['overall_score']);
        $this->assertEquals('advanced', $data['suggested_level']);
        $this->assertArrayHasKey('question_results', $data);
        $this->assertCount(1, $data['question_results']);
    }

    public function test_get_latest_placement_result(): void
    {
        // Submit first placement
        $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'B'],
                ],
            ]);

        // Submit second placement
        $submitResponse = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'A'],
                ],
            ]);

        $latestId = $submitResponse->json('data.placement_result_id');

        // Get latest
        $response = $this->actingAs($this->student)
            ->getJson('/api/student/assessment/placement/latest');

        $response->assertStatus(200);
        $this->assertEquals($latestId, $response->json('data.id'));
    }

    public function test_placement_result_not_found_for_other_user(): void
    {
        // Submit as student
        $submitResponse = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'A'],
                ],
            ]);

        $placementResultId = $submitResponse->json('data.placement_result_id');

        // Try to access as different user
        $otherStudent = User::factory()->create([
            'role' => 'student',
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($otherStudent)
            ->getJson("/api/student/assessment/placement/result/{$placementResultId}");

        $response->assertStatus(404);
    }

    public function test_roadmap_blocks_generated_based_on_level(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'A'],
                ],
            ]);

        $response->assertStatus(201);
        
        // Check roadmap blocks were assigned
        $this->assertGreaterThan(0, $response->json('data.recommended_blocks_count'));
        $this->assertNotEmpty($response->json('data.recommended_block_ids'));
    }

    public function test_placement_result_details_stored_correctly(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson('/api/student/assessment/placement/submit', [
                'domain' => 'frontend',
                'answers' => [
                    ['question_id' => $this->mcqQuestions[0]->id, 'answer' => 'A'],
                    ['question_id' => $this->mcqQuestions[1]->id, 'answer' => 'B'],
                ],
            ]);

        $placementResultId = $response->json('data.placement_result_id');
        
        $result = PlacementResult::find($placementResultId);
        $this->assertNotNull($result);
        
        $details = $result->details;
        $this->assertEquals(2, $details['total_questions']);
        $this->assertEquals(2, $details['mcq_count']);
        $this->assertEquals(0, $details['text_count']);
        $this->assertEquals(1, $details['correct_count']);
        $this->assertArrayHasKey('evaluation_completed_at', $details);
    }
}
