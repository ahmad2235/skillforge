<?php

/**
 * Recommender Engine Configuration
 * 
 * This configuration file defines all tunable parameters for the 
 * cosine-similarity based student recommendation system.
 * 
 * The recommender uses these business rules:
 * 1. Project must be 'open' status
 * 2. Student domain must match project domain
 * 3. Exclude 'low-activity' students
 * 4. Student level must equal the "adjusted required level"
 * 5. 'semi-active' students need minimum similarity threshold
 * 6. Returns top N candidates sorted by similarity score
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Default Recommendation Parameters
    |--------------------------------------------------------------------------
    */
    'top_n_default' => 7,
    'semi_active_min_similarity_default' => 0.80,

    /*
    |--------------------------------------------------------------------------
    | Level Ordering (for comparison operations)
    |--------------------------------------------------------------------------
    | Higher number = higher level
    */
    'level_order' => [
        'beginner' => 0,
        'intermediate' => 1,
        'advanced' => 2,
    ],

    /*
    |--------------------------------------------------------------------------
    | Numeric Encoding (0.0 to 1.0 scale for vectorization)
    |--------------------------------------------------------------------------
    */
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

    /*
    |--------------------------------------------------------------------------
    | Complexity → Minimum Required Level Mapping
    |--------------------------------------------------------------------------
    | Complexity upgrades the minimum required level.
    | The adjusted level = max(project.required_level, complexity_min_level)
    */
    'complexity_min_level' => [
        'low' => 'beginner',
        'medium' => 'intermediate',
        'high' => 'advanced',
    ],

    /*
    |--------------------------------------------------------------------------
    | Expected Skill Baseline by Level
    |--------------------------------------------------------------------------
    | Used in project vector to represent the ideal candidate skill level.
    | These are normalized scores (0.0-1.0) representing avg_score expectation.
    */
    'expected_skill_by_level' => [
        'beginner' => 0.55,
        'intermediate' => 0.75,
        'advanced' => 0.90,
    ],

    /*
    |--------------------------------------------------------------------------
    | Domain Vocabulary
    |--------------------------------------------------------------------------
    | All valid domains for one-hot encoding. Must match your DB enum values.
    */
    'domains' => ['backend', 'frontend', 'fullstack'],

    /*
    |--------------------------------------------------------------------------
    | Activity Profile Vocabulary
    |--------------------------------------------------------------------------
    */
    'activity_profiles' => ['low-activity', 'semi-active', 'active'],

    /*
    |--------------------------------------------------------------------------
    | Feature Weights (optional tuning)
    |--------------------------------------------------------------------------
    | Adjust these to give more/less importance to specific features
    | in the similarity calculation. Default is equal weighting.
    */
    'feature_weights' => [
        'domain' => 1.0,
        'level' => 1.0,
        'activity' => 1.0,
        'skill' => 1.0,
        'reliability' => 1.0,
    ],
];
