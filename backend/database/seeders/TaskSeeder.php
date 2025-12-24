<?php

namespace Database\Seeders;

use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        $blocks = RoadmapBlock::all()->keyBy(function (RoadmapBlock $block) {
            return $block->level . '-' . $block->domain . '-' . $block->order_index;
        });

        $tasks = [
            ['key' => 'beginner-frontend-1', 'title' => 'Build a static landing page', 'description' => 'HTML structure + basic CSS', 'type' => 'project', 'difficulty' => 1, 'max_score' => 100],
            ['key' => 'beginner-frontend-2', 'title' => 'Responsive navbar', 'description' => 'Flexbox exercise', 'type' => 'coding', 'difficulty' => 2, 'max_score' => 100],
            ['key' => 'beginner-backend-1', 'title' => 'CLI ToDo app in PHP', 'description' => 'Practice arrays and loops', 'type' => 'coding', 'difficulty' => 1, 'max_score' => 100],
            ['key' => 'beginner-backend-2', 'title' => 'Simple Laravel CRUD', 'description' => 'Controllers and validation', 'type' => 'project', 'difficulty' => 2, 'max_score' => 100],
            ['key' => 'intermediate-frontend-1', 'title' => 'React task list', 'description' => 'Hooks and components', 'type' => 'project', 'difficulty' => 3, 'max_score' => 100],
        ];

        foreach ($tasks as $task) {
            $block = $blocks->get($task['key']);

            if (!$block) {
                continue;
            }

            $metadata = [];

            // Mark some demo project tasks as requiring an attachment (URL-based)
            if (in_array($task['key'], ['beginner-frontend-1', 'intermediate-frontend-1'], true)) {
                $metadata['requires_attachment'] = true;
                $metadata['attachment_type'] = 'url';
                $metadata['attachment_hint'] = 'Public GitHub repo or downloadable zip link';
            }

            Task::updateOrCreate(
                [
                    'roadmap_block_id' => $block->id,
                    'title' => $task['title'],
                ],
                [
                    'description' => $task['description'],
                    'type'        => $task['type'],
                    'difficulty'  => $task['difficulty'],
                    'max_score'   => $task['max_score'],
                    'is_active'   => true,
                    'metadata'    => $metadata,
                ]
            );
        }
    }
}
