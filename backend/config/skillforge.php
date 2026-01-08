<?php

return [
    // The business role in code represents the employer role described in the proposal.
    'role_aliases' => [
        'business' => 'employer',
    ],

    'placement' => [
        'recommended_blocks_limit' => 6,
    ],

    'invite_expiry_days' => env('INVITE_EXPIRY_DAYS', 7),

    'notifications' => [
        'enabled' => false,
        'project_assignment_invitation' => false,
        'task_evaluation_complete' => false,
        'placement_result' => false,
    ],
];
