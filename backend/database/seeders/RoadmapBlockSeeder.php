<?php

namespace Database\Seeders;

use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use Illuminate\Database\Seeder;

class RoadmapBlockSeeder extends Seeder
{
    public function run(): void
    {
        $blocks = [
            ['level' => 'beginner', 'domain' => 'frontend', 'title' => 'HTML & CSS Basics', 'description' => 'Structure pages and basic styling', 'order_index' => 1, 'estimated_hours' => 6, 'is_optional' => false],
            ['level' => 'beginner', 'domain' => 'frontend', 'title' => 'Responsive Layouts', 'description' => 'Flexbox and grid fundamentals', 'order_index' => 2, 'estimated_hours' => 5, 'is_optional' => false],
            ['level' => 'beginner', 'domain' => 'backend', 'title' => 'PHP Fundamentals', 'description' => 'Syntax, functions, arrays', 'order_index' => 1, 'estimated_hours' => 6, 'is_optional' => false],
            ['level' => 'beginner', 'domain' => 'backend', 'title' => 'Laravel Basics', 'description' => 'Routing, controllers, requests', 'order_index' => 2, 'estimated_hours' => 6, 'is_optional' => false],
            ['level' => 'intermediate', 'domain' => 'frontend', 'title' => 'React Components', 'description' => 'Hooks, state, effects', 'order_index' => 1, 'estimated_hours' => 8, 'is_optional' => false],
        ];

        foreach ($blocks as $block) {
            RoadmapBlock::updateOrCreate(
                [
                    'level' => $block['level'],
                    'domain' => $block['domain'],
                    'order_index' => $block['order_index'],
                ],
                $block
            );
        }
    }
}
