<?php

return [
    'title' => 'SkillForge API',
    'description' => 'Auto-generated API docs for SkillForge (auth, learning, assessment, projects, admin).',
    'base_url' => env('APP_URL', 'http://localhost'),
    'routes' => [
        [
            'match' => [
                'domains' => ['*'],
                'prefixes' => ['api/*'],
                'versions' => ['v1', '*'],
            ],
            'include' => ['*'],
            'exclude' => [],
        ],
    ],
    'examples' => [
        'enabled' => false,
    ],
    'auth' => [
        'enabled' => true,
        'in' => 'header',
        'name' => 'Authorization',
        'use_value' => 'Bearer {token}',
    ],
    'groups' => [
        'order' => [
            'Auth', 'Learning', 'Assessment', 'Projects', 'Admin', 'AI'
        ],
    ],
    'static' => [
        'output_path' => 'public/docs',
    ],
];
