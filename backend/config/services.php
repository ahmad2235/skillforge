<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'evaluator' => [
        'url' => env('EVALUATOR_URL', 'http://127.0.0.1:8001'),
        'timeout' => (int) env('EVALUATOR_TIMEOUT', 30),
        'connect_timeout' => (int) env('EVALUATOR_CONNECT_TIMEOUT', 5),
        'health_timeout' => (int) env('EVALUATOR_HEALTH_TIMEOUT', 3),
        'max_retries' => (int) env('EVALUATOR_MAX_RETRIES', 1),
    ],

    /*
    |--------------------------------------------------------------------------
    | Project Leveler Service (PDF Analysis via OpenAI)
    |--------------------------------------------------------------------------
    |
    | This service analyzes PDF project descriptions and extracts:
    | - domain (backend, frontend, fullstack)
    | - required_level (beginner, intermediate, advanced)
    | - complexity (low, medium, high)
    | - technology stack suggestions
    |
    */
    'project_leveler' => [
        'url' => env('PROJECT_LEVELER_URL', 'http://127.0.0.1:8002'),
        'timeout' => (int) env('PROJECT_LEVELER_TIMEOUT', 60),
        'connect_timeout' => (int) env('PROJECT_LEVELER_CONNECT_TIMEOUT', 5),
    ],

];
