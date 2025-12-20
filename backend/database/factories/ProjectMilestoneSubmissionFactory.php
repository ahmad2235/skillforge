<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestoneSubmission;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectMilestoneSubmissionFactory extends Factory
{
    protected $model = ProjectMilestoneSubmission::class;

    public function definition(): array
    {
        $assignment = ProjectAssignment::factory()->create();
        $milestone = ProjectMilestone::factory()->create([
            'project_id' => $assignment->project_id,
        ]);

        return [
            'project_assignment_id' => $assignment->id,
            'project_milestone_id' => $milestone->id,
            'user_id' => $assignment->user_id,
            'answer_text' => $this->faker->sentence(6),
            'attachment_url' => null,
            'status' => 'submitted',
            'review_feedback' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ];
    }
}
