<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestoneSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMilestoneSubmissionReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_approve_submission_via_review_endpoint()
    {
        // Create admin
        $admin = User::factory()->create(['role' => 'admin']);

        // Create minimal project, assignment, milestone, and submission manually to avoid factory chain issues
        $project = \App\Modules\Projects\Infrastructure\Models\Project::factory()->create();
        $student = User::factory()->student()->create();

        $assignment = \App\Modules\Projects\Infrastructure\Models\ProjectAssignment::create([
            'project_id' => $project->id,
            'user_id' => $student->id,
            'status' => 'accepted',
            'metadata' => ['source' => 'test'],
        ]);

        $milestone = \App\Modules\Projects\Infrastructure\Models\ProjectMilestone::create([
            'project_id' => $project->id,
            'title' => 'Test milestone',
            'description' => 'Test',
            'order_index' => 1,
            'is_required' => true,
        ]);

        $submission = ProjectMilestoneSubmission::create([
            'project_assignment_id' => $assignment->id,
            'project_milestone_id' => $milestone->id,
            'user_id' => $student->id,
            'answer_text' => 'Answer',
            'status' => 'submitted',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/projects/milestone-submissions/{$submission->id}/review", [
                'status' => 'approved',
                'feedback' => 'Good job',
            ])
            ->assertStatus(200)
            ->assertJsonStructure(['message', 'submission' => ['id', 'status']])
            ->assertJsonPath('submission.status', 'approved');

        $this->assertDatabaseHas('project_milestone_submissions', [
            'id' => $submission->id,
            'status' => 'approved',
        ]);
    }
}
