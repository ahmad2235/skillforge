<?php

namespace Database\Seeders;

use App\Modules\Assessment\Infrastructure\Models\Question;
use Illuminate\Database\Seeder;

/**
 * QuestionSeeder - Comprehensive placement questions
 * 
 * Scoring System:
 * - MCQ: 0 (wrong) or 100 (correct) - correct answer stored in metadata
 * - Text: AI evaluates 0-100 based on answer quality
 * 
 * Level Classification:
 * - Beginner: 0-49% (needs foundational training)
 * - Intermediate: 50-79% (has fundamentals, ready for production skills)
 * - Advanced: 80-100% (experienced, ready for architecture)
 */
class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        $questions = [
            // ══════════════════════════════════════════════════════════════════
            // FRONTEND PLACEMENT QUESTIONS (15 questions)
            // ══════════════════════════════════════════════════════════════════
            
            // BEGINNER FRONTEND (Questions 1-5)
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'question_text' => 'What is the purpose of semantic HTML elements like <header>, <nav>, <main>, and <footer>?',
                'type' => 'mcq',
                'difficulty' => 1,
                'metadata' => [
                    'options' => [
                        'They make the page load faster',
                        'They provide meaning to the structure and improve accessibility and SEO',
                        'They are required for CSS styling to work',
                        'They automatically add navigation menus'
                    ],
                    'correct_answer' => 'They provide meaning to the structure and improve accessibility and SEO'
                ]
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'question_text' => 'Explain the CSS box model and its four components (content, padding, border, margin).',
                'type' => 'text',
                'difficulty' => 2,
                'metadata' => null
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'question_text' => 'What is the difference between var, let, and const in JavaScript?',
                'type' => 'mcq',
                'difficulty' => 1,
                'metadata' => [
                    'options' => [
                        'They are all the same just different syntax',
                        'var is for numbers let is for strings const is for booleans',
                        'var is function-scoped and hoisted let and const are block-scoped const cannot be reassigned',
                        'let is faster than var const is slower'
                    ],
                    'correct_answer' => 'var is function-scoped and hoisted let and const are block-scoped const cannot be reassigned'
                ]
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'question_text' => 'How do you select an element with id="myButton" using JavaScript? Explain querySelector vs getElementById.',
                'type' => 'text',
                'difficulty' => 2,
                'metadata' => null
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'question_text' => 'What CSS property would you use to make a layout responsive for mobile devices?',
                'type' => 'mcq',
                'difficulty' => 1,
                'metadata' => [
                    'options' => [
                        'display responsive',
                        'Media queries with @media screen and max-width',
                        'mobile true',
                        'responsive-design enabled'
                    ],
                    'correct_answer' => 'Media queries with @media screen and max-width'
                ]
            ],

            // INTERMEDIATE FRONTEND (Questions 6-10)
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'question_text' => 'Explain the difference between useEffect and useMemo in React. When would you use each?',
                'type' => 'text',
                'difficulty' => 3,
                'metadata' => null
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'question_text' => 'What is the Virtual DOM in React and why does it improve performance?',
                'type' => 'mcq',
                'difficulty' => 3,
                'metadata' => [
                    'options' => [
                        'A backup copy of the DOM in case the page crashes',
                        'A lightweight copy of the real DOM that React uses to calculate minimal updates before applying them',
                        'A testing environment for React components',
                        'A cloud storage system for React state'
                    ],
                    'correct_answer' => 'A lightweight copy of the real DOM that React uses to calculate minimal updates before applying them'
                ]
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'question_text' => 'Describe how you would handle global state management in a React app. Compare Context API vs Redux or Zustand.',
                'type' => 'text',
                'difficulty' => 4,
                'metadata' => null
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'question_text' => 'What is the purpose of TypeScript in frontend development?',
                'type' => 'mcq',
                'difficulty' => 3,
                'metadata' => [
                    'options' => [
                        'It makes JavaScript run faster in the browser',
                        'It adds static type checking to catch errors during development before runtime',
                        'It is required for React to work properly',
                        'It automatically fixes bugs in your code'
                    ],
                    'correct_answer' => 'It adds static type checking to catch errors during development before runtime'
                ]
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'question_text' => 'Explain code splitting and lazy loading in React. How would you implement them?',
                'type' => 'text',
                'difficulty' => 4,
                'metadata' => null
            ],

            // ADVANCED FRONTEND (Questions 11-15)
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'question_text' => 'What is Server-Side Rendering SSR and what are its advantages over Client-Side Rendering CSR?',
                'type' => 'mcq',
                'difficulty' => 4,
                'metadata' => [
                    'options' => [
                        'SSR stores data on the server instead of the client',
                        'SSR renders HTML on the server for faster initial load and better SEO while CSR renders in the browser',
                        'SSR is only used for backend APIs',
                        'SSR makes websites work offline'
                    ],
                    'correct_answer' => 'SSR renders HTML on the server for faster initial load and better SEO while CSR renders in the browser'
                ]
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'question_text' => 'Explain the difference between Static Site Generation SSG Server-Side Rendering SSR and Incremental Static Regeneration ISR in Next.js.',
                'type' => 'text',
                'difficulty' => 5,
                'metadata' => null
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'question_text' => 'How would you implement a design system at scale with theming accessibility and documentation?',
                'type' => 'text',
                'difficulty' => 5,
                'metadata' => null
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'question_text' => 'What are Web Vitals LCP FID CLS and how do you optimize them?',
                'type' => 'mcq',
                'difficulty' => 4,
                'metadata' => [
                    'options' => [
                        'Security standards for protecting user data',
                        'Performance metrics Largest Contentful Paint First Input Delay Cumulative Layout Shift optimize via code splitting lazy loading proper sizing',
                        'Testing frameworks for React components',
                        'Browser compatibility requirements'
                    ],
                    'correct_answer' => 'Performance metrics Largest Contentful Paint First Input Delay Cumulative Layout Shift optimize via code splitting lazy loading proper sizing'
                ]
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'question_text' => 'Describe your approach to building a real-time collaborative application like Google Docs. Cover WebSockets conflict resolution and state synchronization.',
                'type' => 'text',
                'difficulty' => 5,
                'metadata' => null
            ],

            // ══════════════════════════════════════════════════════════════════
            // BACKEND PLACEMENT QUESTIONS (15 questions)
            // ══════════════════════════════════════════════════════════════════
            
            // BEGINNER BACKEND (Questions 1-5)
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'question_text' => 'What is the difference between HTTP GET and POST methods?',
                'type' => 'mcq',
                'difficulty' => 1,
                'metadata' => [
                    'options' => [
                        'GET is faster than POST',
                        'GET retrieves data and is idempotent POST sends data to create or update resources and may have side effects',
                        'GET is for reading files POST is for writing files',
                        'There is no difference they are interchangeable'
                    ],
                    'correct_answer' => 'GET retrieves data and is idempotent POST sends data to create or update resources and may have side effects'
                ]
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'question_text' => 'Explain what RESTful API design principles are and give an example of proper endpoint naming.',
                'type' => 'text',
                'difficulty' => 2,
                'metadata' => null
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'question_text' => 'What is a primary key in a relational database?',
                'type' => 'mcq',
                'difficulty' => 1,
                'metadata' => [
                    'options' => [
                        'The first column in a database table',
                        'A unique identifier for each row in a table that cannot be null',
                        'A password required to access the database',
                        'The most important data in the table'
                    ],
                    'correct_answer' => 'A unique identifier for each row in a table that cannot be null'
                ]
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'question_text' => 'Explain the difference between a foreign key and a join in SQL. Provide an example query.',
                'type' => 'text',
                'difficulty' => 2,
                'metadata' => null
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'question_text' => 'What is the purpose of environment variables in backend applications?',
                'type' => 'mcq',
                'difficulty' => 1,
                'metadata' => [
                    'options' => [
                        'To make the application run faster',
                        'To store configuration and secrets separately from code for different environments',
                        'To create backup copies of the database',
                        'To define CSS styles for the backend'
                    ],
                    'correct_answer' => 'To store configuration and secrets separately from code for different environments'
                ]
            ],

            // INTERMEDIATE BACKEND (Questions 6-10)
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'question_text' => 'Explain how JWT JSON Web Token authentication works. What are the three parts of a JWT?',
                'type' => 'text',
                'difficulty' => 3,
                'metadata' => null
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'question_text' => 'What is the N+1 query problem in ORMs and how do you solve it?',
                'type' => 'mcq',
                'difficulty' => 3,
                'metadata' => [
                    'options' => [
                        'When you accidentally create N+1 database tables',
                        'Making N additional queries in a loop instead of using eager loading or joins solved with eager loading',
                        'A security vulnerability in SQL databases',
                        'When your database has N+1 users'
                    ],
                    'correct_answer' => 'Making N additional queries in a loop instead of using eager loading or joins solved with eager loading'
                ]
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'question_text' => 'Describe database indexing. When should you add an index and when should you avoid it?',
                'type' => 'text',
                'difficulty' => 4,
                'metadata' => null
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'question_text' => 'What is the purpose of Redis in a backend application?',
                'type' => 'mcq',
                'difficulty' => 3,
                'metadata' => [
                    'options' => [
                        'A replacement for SQL databases',
                        'In-memory data store for caching session storage and message queuing',
                        'A frontend framework for building UIs',
                        'A tool for writing backend code faster'
                    ],
                    'correct_answer' => 'In-memory data store for caching session storage and message queuing'
                ]
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'question_text' => 'Explain the concept of database transactions and ACID properties. Why are they important?',
                'type' => 'text',
                'difficulty' => 4,
                'metadata' => null
            ],

            // ADVANCED BACKEND (Questions 11-15)
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'question_text' => 'What is the main difference between monolithic and microservices architecture?',
                'type' => 'mcq',
                'difficulty' => 4,
                'metadata' => [
                    'options' => [
                        'Microservices are always faster than monoliths',
                        'Monolithic is a single deployable unit microservices are independently deployable services with separate databases',
                        'Monolithic uses SQL microservices use NoSQL',
                        'There is no difference in production'
                    ],
                    'correct_answer' => 'Monolithic is a single deployable unit microservices are independently deployable services with separate databases'
                ]
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'question_text' => 'Explain the Saga pattern for distributed transactions in microservices. How does it differ from two-phase commit?',
                'type' => 'text',
                'difficulty' => 5,
                'metadata' => null
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'question_text' => 'How would you design a system to handle 1 million requests per minute? Cover load balancing caching database scaling.',
                'type' => 'text',
                'difficulty' => 5,
                'metadata' => null
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'question_text' => 'What is the purpose of an API Gateway in a microservices architecture?',
                'type' => 'mcq',
                'difficulty' => 4,
                'metadata' => [
                    'options' => [
                        'A security firewall that blocks malicious requests',
                        'Single entry point for all client requests handles routing authentication rate limiting and request aggregation',
                        'A tool for generating API documentation',
                        'A database for storing API logs'
                    ],
                    'correct_answer' => 'Single entry point for all client requests handles routing authentication rate limiting and request aggregation'
                ]
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'question_text' => 'Describe your approach to monitoring and observability in production systems. Cover metrics logging tracing and alerting.',
                'type' => 'text',
                'difficulty' => 5,
                'metadata' => null
            ],
        ];

        foreach ($questions as $question) {
            Question::updateOrCreate(
                [
                    'question_text' => $question['question_text'],
                    'domain' => $question['domain'],
                ],
                $question
            );
        }
    }
}
