<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Business Rules
    |--------------------------------------------------------------------------
    */
    'top_n_default' => 7,
    'semi_active_min_similarity_default' => 0.80,

    /*
    |--------------------------------------------------------------------------
    | Level / Complexity
    |--------------------------------------------------------------------------
    */
    'level_order' => [
        'beginner' => 0,
        'intermediate' => 1,
        'advanced' => 2,
    ],

    // for numeric encoding (0..1)
    'level_to_num' => [
        'beginner' => 0.0,
        'intermediate' => 0.5,
        'advanced' => 1.0,
    ],

    'activity_to_num' => [
        'low-activity' => 0.0,
        'semi-active' => 0.5,
        'active' => 1.0,
    ],

    // complexity upgrades minimum required level
    'complexity_min_level' => [
        'low' => 'beginner',
        'medium' => 'intermediate',
        'high' => 'advanced',
    ],

    /*
    |--------------------------------------------------------------------------
    | Project expected skill baseline
    |--------------------------------------------------------------------------
    | Used only for the "project vector". Tunable.
    */
    'expected_skill_by_level' => [
        'beginner' => 0.55,
        'intermediate' => 0.75,
        'advanced' => 0.90,
    ],

    /*
    |--------------------------------------------------------------------------
    | Data Field Mapping (edit to match your DB columns)
    |--------------------------------------------------------------------------
    | These keys are used by repositories to return normalized arrays.
    */
    'fields' => [
        'project' => [
            'id' => 'id',
            'status' => 'status',
            'domain' => 'domain',
            'required_level' => 'required_level',
            'complexity' => 'complexity',
        ],
        'student' => [
            'id' => 'id',
            'name' => 'name',
            'domain' => 'domain',
            'level' => 'level',
            'activity_profile' => 'activity_profile',
            // profile settings structure can be flattened in DB; repository normalizes to:
            // profile_settings: ['avg_score_range' => [min,max], 'weight' => float]
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | JSON Demo Source (optional)
    |--------------------------------------------------------------------------
    */
    'json_demo_path' => storage_path('app/recommender/ai_analysis.json'),
];
