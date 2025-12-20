<?php

namespace Tests\Feature\Projects;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestoneSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectMilestonesTest extends TestCase
{
    use RefreshDatabase;

    public function test_business_can_manage_milestones(): void
    {
        $owner = User::factory()->business()->create();
        $project = Project::factory()->create(['owner_id' => $owner->id]);

        Sanctum::actingAs($owner);

        $create = $this->postJson("/api/business/projects/{$project->id}/milestones", [
            'title' => 'First milestone',
            'description' => 'Do the initial setup',
            'order_index' => 1,
            'due_date' => now()->addWeek()->toDateString(),
            'is_required' => true,
        ]);

        $create->assertStatus(201)
            ->assertJsonPath('data.title', 'First milestone');

        $list = $this->getJson("/api/business/projects/{$project->id}/milestones")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $milestoneId = $list->json('data.0.id');

        $update = $this->putJson("/api/business/projects/{$project->id}/milestones/{$milestoneId}", [
            'title' => 'Updated milestone',
            'is_required' => false,
        ]);

        $update->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated milestone')
            ->assertJsonPath('data.is_required', false);

        $this->deleteJson("/api/business/projects/{$project->id}/milestones/{$milestoneId}")
            ->assertStatus(200);

        $this->getJson("/api/business/projects/{$project->id}/milestones")
            ->assertStatus(200)
            ->assertJson([
                'data' => [],
            ]);
    }

    public function test_student_can_list_and_submit_milestones(): void
    {
        $owner = User::factory()->business()->create();
        $project = Project::factory()->create(['owner_id' => $owner->id]);
        $student = User::factory()->student()->create();

        $assignment = ProjectAssignment::factory()->create([
            'project_id' => $project->id,
            'user_id' => $student->id,
            'status' => 'accepted',
        ]);

        $milestoneA = ProjectMilestone::factory()->create([
            'project_id' => $project->id,
            'order_index' => 1,
        ]);

        $milestoneB = ProjectMilestone::factory()->create([
            'project_id' => $project->id,
            'order_index' => 2,
        ]);

        Sanctum::actingAs($student);

        $list = $this->getJson("/api/student/projects/assignments/{$assignment->id}/milestones")
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $this->assertNull($list->json('data.0.submission'));

        $submit = $this->postJson(
            "/api/student/projects/assignments/{$assignment->id}/milestones/{$milestoneA->id}/submit",
            [
                'answer_text' => 'Here is my work',
            ]
        );

        $submit->assertStatus(201)
            ->assertJsonPath('data.status', 'submitted');

        $updatedList = $this->getJson("/api/student/projects/assignments/{$assignment->id}/milestones")
            ->assertStatus(200);

        $this->assertEquals('submitted', $updatedList->json('data.0.submission.status'));
    }

    public function test_admin_can_list_and_review_milestone_submissions(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->student()->create();
        $project = Project::factory()->create();

        $assignment = ProjectAssignment::factory()->create([
            'project_id' => $project->id,
            'user_id' => $student->id,
            'status' => 'accepted',
        ]);

        $milestone = ProjectMilestone::factory()->create([
            'project_id' => $project->id,
            'order_index' => 1,
        ]);

        $submission = ProjectMilestoneSubmission::create([
            'project_assignment_id' => $assignment->id,
            'project_milestone_id' => $milestone->id,
            'user_id' => $student->id,
            'answer_text' => 'Review this',
            'attachment_url' => null,
            'status' => 'submitted',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/projects/milestone-submissions?status=submitted')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $review = $this->postJson(
            "/api/admin/projects/milestone-submissions/{$submission->id}/review",
            [
                'status' => 'approved',
                'feedback' => 'Looks good',
            ]
        );

        $review->assertStatus(200)
            ->assertJsonPath('submission.status', 'approved')
            ->assertJsonPath('submission.review_feedback', 'Looks good');
    }
}
