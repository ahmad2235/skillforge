<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        $business = User::where('role', 'business')->first();

        if (!$business) {
            $business = User::factory()->business()->create([
                'email' => 'demo-business@example.com',
            ]);
        }

        $projects = [
            [
                'title' => 'Landing Page Revamp',
                'description' => 'Improve marketing site visuals',
                'domain' => 'frontend',
                'required_level' => 'beginner',
                'status' => 'open',
                'owner_id' => $business->id,
            ],
            [
                'title' => 'API Integration',
                'description' => 'Build CRUD API for internal tools',
                'domain' => 'backend',
                'required_level' => 'intermediate',
                'status' => 'open',
                'owner_id' => $business->id,
            ],
        ];

        foreach ($projects as $projectData) {
            $project = Project::updateOrCreate(
                [
                    'owner_id' => $projectData['owner_id'],
                    'title' => $projectData['title'],
                ],
                $projectData
            );

            $this->seedMilestones($project);
        }
    }

    private function seedMilestones(Project $project): void
    {
        $defaults = [
            ['title' => 'Kickoff & Requirements', 'order_index' => 1],
            ['title' => 'MVP Delivery', 'order_index' => 2],
        ];

        foreach ($defaults as $milestone) {
            ProjectMilestone::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'order_index' => $milestone['order_index'],
                ],
                [
                    'title' => $milestone['title'],
                    'description' => null,
                    'due_date' => now()->addWeeks($milestone['order_index']),
                    'is_required' => true,
                ]
            );
        }
    }
}
