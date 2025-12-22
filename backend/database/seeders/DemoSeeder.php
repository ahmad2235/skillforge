<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\Skill;
use App\Modules\Assessment\Infrastructure\Models\Question;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * DemoSeeder - Minimum viable seed data for internal MVP demo.
 *
 * IDEMPOTENT: Safe to run multiple times. Uses firstOrCreate/updateOrCreate.
 *
 * Populates:
 * - 1 admin user
 * - 1 business user
 * - 3 students (beginner/intermediate/advanced)
 * - 1 roadmap with 3 blocks (beginner + frontend)
 * - Skills for Phase 9
 * - 3 tasks in first block (linked to skills)
 * - 10 placement questions (mixed levels/domains)
 *
 * Usage: php artisan db:seed --class=DemoSeeder
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedUsers();
        $this->seedRoadmapBlocks();
        $this->seedSkills();
        $this->seedTasks();
        $this->seedQuestions();

        $this->command->info('✅ DemoSeeder completed successfully.');
        $this->command->table(
            ['Entity', 'Count'],
            [
                ['Users (total)', User::count()],
                ['  - admin', User::where('role', 'admin')->count()],
                ['  - business', User::where('role', 'business')->count()],
                ['  - student', User::where('role', 'student')->count()],
                ['Roadmap Blocks', RoadmapBlock::count()],
                ['Skills', Skill::count()],
                ['Tasks', Task::count()],
                ['Questions', Question::count()],
            ]
        );
    }

    private function seedUsers(): void
    {
        // Admin user
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name'      => 'Admin User',
                'password'  => Hash::make('password'),
                'role'      => 'admin',
                'level'     => null,
                'domain'    => null,
                'is_active' => true,
            ]
        );

        // Business user
        User::firstOrCreate(
            ['email' => 'business@example.com'],
            [
                'name'      => 'Business Owner',
                'password'  => Hash::make('password'),
                'role'      => 'business',
                'level'     => null,
                'domain'    => null,
                'is_active' => true,
            ]
        );

        // Student: Beginner (frontend)
        User::firstOrCreate(
            ['email' => 'student.beginner@example.com'],
            [
                'name'      => 'Beginner Student',
                'password'  => Hash::make('password'),
                'role'      => 'student',
                'level'     => 'beginner',
                'domain'    => 'frontend',
                'is_active' => true,
            ]
        );

        // Student: Intermediate (backend)
        User::firstOrCreate(
            ['email' => 'student.intermediate@example.com'],
            [
                'name'      => 'Intermediate Student',
                'password'  => Hash::make('password'),
                'role'      => 'student',
                'level'     => 'intermediate',
                'domain'    => 'backend',
                'is_active' => true,
            ]
        );

        // Student: Advanced (frontend)
        User::firstOrCreate(
            ['email' => 'student.advanced@example.com'],
            [
                'name'      => 'Advanced Student',
                'password'  => Hash::make('password'),
                'role'      => 'student',
                'level'     => 'advanced',
                'domain'    => 'frontend',
                'is_active' => true,
            ]
        );
    }

    private function seedRoadmapBlocks(): void
    {
        // 3 blocks for beginner + frontend roadmap
        $blocks = [
            [
                'level'           => 'beginner',
                'domain'          => 'frontend',
                'title'           => 'HTML & CSS Fundamentals',
                'description'     => 'Learn the building blocks of the web: semantic HTML structure and CSS styling basics.',
                'order_index'     => 1,
                'estimated_hours' => 8,
                'is_optional'     => false,
            ],
            [
                'level'           => 'beginner',
                'domain'          => 'frontend',
                'title'           => 'Responsive Design',
                'description'     => 'Master Flexbox and Grid layouts to create responsive, mobile-first designs.',
                'order_index'     => 2,
                'estimated_hours' => 6,
                'is_optional'     => false,
            ],
            [
                'level'           => 'beginner',
                'domain'          => 'frontend',
                'title'           => 'JavaScript Basics',
                'description'     => 'Introduction to JavaScript: variables, functions, DOM manipulation, and events.',
                'order_index'     => 3,
                'estimated_hours' => 10,
                'is_optional'     => false,
            ],
        ];

        foreach ($blocks as $block) {
            RoadmapBlock::updateOrCreate(
                [
                    'level'       => $block['level'],
                    'domain'      => $block['domain'],
                    'order_index' => $block['order_index'],
                ],
                $block
            );
        }
    }

    private function seedSkills(): void
    {
        // Phase 9: Skills for structured skill tracking
        $skills = [
            // Frontend beginner skills
            [
                'code'        => 'html',
                'name'        => 'HTML',
                'description' => 'Hypertext Markup Language - semantic structure of web pages.',
                'domain'      => 'frontend',
                'level'       => 'beginner',
                'is_active'   => true,
            ],
            [
                'code'        => 'css',
                'name'        => 'CSS',
                'description' => 'Cascading Style Sheets - styling and layout of web pages.',
                'domain'      => 'frontend',
                'level'       => 'beginner',
                'is_active'   => true,
            ],
            [
                'code'        => 'js-basics',
                'name'        => 'JavaScript Basics',
                'description' => 'Fundamentals of JavaScript: variables, functions, DOM, events.',
                'domain'      => 'frontend',
                'level'       => 'beginner',
                'is_active'   => true,
            ],
            // Backend beginner skills
            [
                'code'        => 'sql',
                'name'        => 'SQL',
                'description' => 'Structured Query Language for database operations.',
                'domain'      => 'backend',
                'level'       => 'beginner',
                'is_active'   => true,
            ],
            [
                'code'        => 'rest-api',
                'name'        => 'REST API',
                'description' => 'RESTful API design principles and implementation.',
                'domain'      => 'backend',
                'level'       => 'beginner',
                'is_active'   => true,
            ],
        ];

        foreach ($skills as $skill) {
            Skill::updateOrCreate(
                ['code' => $skill['code']],
                $skill
            );
        }
    }

    private function seedTasks(): void
    {
        // Find the first block (HTML & CSS Fundamentals)
        $firstBlock = RoadmapBlock::where('level', 'beginner')
            ->where('domain', 'frontend')
            ->where('order_index', 1)
            ->first();

        if (!$firstBlock) {
            $this->command->warn('⚠️  First roadmap block not found. Skipping tasks.');
            return;
        }

        // Get skills for linking
        $htmlSkill = Skill::where('code', 'html')->first();
        $cssSkill = Skill::where('code', 'css')->first();

        // Default rubric template for Phase 9
        $defaultRubric = [
            'correctness' => 5,
            'structure'   => 5,
            'clarity'     => 5,
        ];

        // 3 tasks for the first block
        $tasks = [
            [
                'title'       => 'Create a Personal Bio Page',
                'description' => 'Build a simple HTML page with your name, a short bio, and a profile image. Use semantic HTML5 tags like <header>, <main>, <article>, and <footer>.',
                'type'        => 'coding',
                'difficulty'  => 1,
                'max_score'   => 100,
                'skill_id'    => $htmlSkill?->id,
                'rubric'      => $defaultRubric,
                'weight'      => 1,
            ],
            [
                'title'       => 'Style Your Bio Page with CSS',
                'description' => 'Apply CSS styling to your bio page: custom fonts, colors, spacing, and a centered layout. Practice using classes and the box model.',
                'type'        => 'coding',
                'difficulty'  => 2,
                'max_score'   => 100,
                'skill_id'    => $cssSkill?->id,
                'rubric'      => $defaultRubric,
                'weight'      => 1,
            ],
            [
                'title'       => 'Build a Simple Navigation Menu',
                'description' => 'Create a horizontal navigation bar with HTML and CSS. Include hover effects and ensure the active link is visually distinct.',
                'type'        => 'project',
                'difficulty'  => 2,
                'max_score'   => 100,
                'skill_id'    => $cssSkill?->id,
                'rubric'      => $defaultRubric,
                'weight'      => 2,
            ],
        ];

        foreach ($tasks as $task) {
            Task::updateOrCreate(
                [
                    'roadmap_block_id' => $firstBlock->id,
                    'title'            => $task['title'],
                ],
                [
                    'description' => $task['description'],
                    'type'        => $task['type'],
                    'difficulty'  => $task['difficulty'],
                    'max_score'   => $task['max_score'],
                    'skill_id'    => $task['skill_id'] ?? null,
                    'rubric'      => $task['rubric'] ?? null,
                    'weight'      => $task['weight'] ?? 1,
                    'is_active'   => true,
                    'metadata'    => [],
                ]
            );
        }
    }

    private function seedQuestions(): void
    {
        // 10 placement questions: mixed levels and domains
        $questions = [
            // Beginner Frontend (3)
            [
                'level'         => 'beginner',
                'domain'        => 'frontend',
                'question_text' => 'What does HTML stand for?',
                'type'          => 'mcq',
                'difficulty'    => 1,
                'metadata'      => [
                    'options' => [
                        'A' => 'Hyper Text Markup Language',
                        'B' => 'High Tech Modern Language',
                        'C' => 'Home Tool Markup Language',
                        'D' => 'Hyperlinks and Text Markup Language',
                    ],
                    'correct_answer' => 'A',
                ],
            ],
            [
                'level'         => 'beginner',
                'domain'        => 'frontend',
                'question_text' => 'Which CSS property is used to change the text color of an element?',
                'type'          => 'mcq',
                'difficulty'    => 1,
                'metadata'      => [
                    'options' => [
                        'A' => 'font-color',
                        'B' => 'text-color',
                        'C' => 'color',
                        'D' => 'foreground-color',
                    ],
                    'correct_answer' => 'C',
                ],
            ],
            [
                'level'         => 'beginner',
                'domain'        => 'frontend',
                'question_text' => 'Explain the difference between inline, block, and inline-block display values in CSS.',
                'type'          => 'text',
                'difficulty'    => 2,
                'metadata'      => [],
            ],
            // Beginner Backend (3)
            [
                'level'         => 'beginner',
                'domain'        => 'backend',
                'question_text' => 'What is the correct way to declare a variable in PHP?',
                'type'          => 'mcq',
                'difficulty'    => 1,
                'metadata'      => [
                    'options' => [
                        'A' => 'var myVar = 5;',
                        'B' => '$myVar = 5;',
                        'C' => 'let myVar = 5;',
                        'D' => 'int myVar = 5;',
                    ],
                    'correct_answer' => 'B',
                ],
            ],
            [
                'level'         => 'beginner',
                'domain'        => 'backend',
                'question_text' => 'Which Laravel artisan command creates a new migration file?',
                'type'          => 'mcq',
                'difficulty'    => 1,
                'metadata'      => [
                    'options' => [
                        'A' => 'php artisan create:migration',
                        'B' => 'php artisan generate:migration',
                        'C' => 'php artisan make:migration',
                        'D' => 'php artisan new:migration',
                    ],
                    'correct_answer' => 'C',
                ],
            ],
            [
                'level'         => 'beginner',
                'domain'        => 'backend',
                'question_text' => 'What is PSR-4 and why is it important in PHP development?',
                'type'          => 'text',
                'difficulty'    => 2,
                'metadata'      => [],
            ],
            // Intermediate (2)
            [
                'level'         => 'intermediate',
                'domain'        => 'frontend',
                'question_text' => 'Explain the difference between useEffect and useLayoutEffect in React.',
                'type'          => 'text',
                'difficulty'    => 3,
                'metadata'      => [],
            ],
            [
                'level'         => 'intermediate',
                'domain'        => 'backend',
                'question_text' => 'Describe the Repository Pattern and its benefits in Laravel applications.',
                'type'          => 'text',
                'difficulty'    => 3,
                'metadata'      => [],
            ],
            // Advanced (2)
            [
                'level'         => 'advanced',
                'domain'        => 'frontend',
                'question_text' => 'Explain how React Fiber works and why it was introduced.',
                'type'          => 'text',
                'difficulty'    => 5,
                'metadata'      => [],
            ],
            [
                'level'         => 'advanced',
                'domain'        => 'backend',
                'question_text' => 'Describe CQRS (Command Query Responsibility Segregation) and when you would apply it.',
                'type'          => 'text',
                'difficulty'    => 5,
                'metadata'      => [],
            ],
        ];

        foreach ($questions as $question) {
            Question::updateOrCreate(
                ['question_text' => $question['question_text']],
                $question
            );
        }
    }
}
