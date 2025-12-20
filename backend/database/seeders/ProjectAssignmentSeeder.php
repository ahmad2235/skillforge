<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use Illuminate\Database\Seeder;

class ProjectAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $project = Project::first();
        $student = User::where('role', 'student')->first();

        if (!$project || !$student) {
            return;
        }

        ProjectAssignment::updateOrCreate(
            [
                'project_id' => $project->id,
                'user_id' => $student->id,
            ],
            [
                'status' => 'invited',
                'metadata' => ['source' => 'seeder'],
            ]
        );
    }
}
