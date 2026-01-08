<?php

namespace Database\Seeders;

use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use Illuminate\Database\Seeder;

/**
 * RoadmapBlockSeeder - Comprehensive learning path blocks
 * 
 * Structure: Domain (Backend/Frontend) × Level (Beginner/Intermediate/Advanced)
 * Based on market-demanded skills roadmap
 */
class RoadmapBlockSeeder extends Seeder
{
    public function run(): void
    {
        $blocks = [
            // ══════════════════════════════════════════════════════════════════
            // BACKEND - BEGINNER LEVEL
            // ══════════════════════════════════════════════════════════════════
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'title' => 'Internet & Web Fundamentals',
                'description' => 'Understand how the internet works: HTTP protocol, DNS, domain names, hosting, and browser-server communication.',
                'order_index' => 1,
                'estimated_hours' => 4,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'title' => 'Terminal & OS Basics',
                'description' => 'Learn command line basics: navigation, file operations, environment variables, and shell scripting fundamentals.',
                'order_index' => 2,
                'estimated_hours' => 5,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'title' => 'Programming Fundamentals',
                'description' => 'Core programming concepts: variables, data types, conditions, loops, functions, arrays, and basic error handling.',
                'order_index' => 3,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'title' => 'Web Basics for Backend',
                'description' => 'Basic HTML, CSS, and JavaScript to understand how frontend and backend communicate.',
                'order_index' => 4,
                'estimated_hours' => 6,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'title' => 'Version Control with Git',
                'description' => 'Git fundamentals: init, clone, commit, push, pull, branching, merging, and GitHub collaboration.',
                'order_index' => 5,
                'estimated_hours' => 5,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'title' => 'First Backend Framework',
                'description' => 'Build your first REST API using a backend framework. Learn routing, controllers, and basic CRUD operations.',
                'order_index' => 6,
                'estimated_hours' => 15,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'title' => 'Database Fundamentals',
                'description' => 'Relational database basics: tables, rows, columns, primary keys, and SQL queries (SELECT, INSERT, UPDATE, DELETE).',
                'order_index' => 7,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'backend',
                'title' => 'First Deployment',
                'description' => 'Deploy your first application: environment setup, hosting platforms, and making your API publicly accessible.',
                'order_index' => 8,
                'estimated_hours' => 4,
                'is_optional' => false,
            ],

            // ══════════════════════════════════════════════════════════════════
            // BACKEND - INTERMEDIATE LEVEL
            // ══════════════════════════════════════════════════════════════════
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'title' => 'Production REST APIs',
                'description' => 'Build production-grade REST APIs: validation, error handling, pagination, filtering, sorting, API versioning, file uploads.',
                'order_index' => 1,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'title' => 'Authentication & Security',
                'description' => 'Implement secure authentication: JWT, sessions, HTTPS/SSL, CORS, password hashing (BCrypt/Argon2).',
                'order_index' => 2,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'title' => 'GraphQL Basics',
                'description' => 'Introduction to GraphQL: schema design, types, queries, mutations, and resolvers.',
                'order_index' => 3,
                'estimated_hours' => 8,
                'is_optional' => true,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'title' => 'Advanced Database Design',
                'description' => 'Deep database knowledge: joins, indexes, transactions, constraints, normalization, ACID, N+1 problem.',
                'order_index' => 4,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'title' => 'NoSQL & Caching',
                'description' => 'NoSQL databases (MongoDB/DynamoDB) and caching strategies with Redis.',
                'order_index' => 5,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'title' => 'ORM Mastery',
                'description' => 'Object-Relational Mapping: models, relationships, lazy vs eager loading, query optimization.',
                'order_index' => 6,
                'estimated_hours' => 8,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'title' => 'Background Jobs & Queues',
                'description' => 'Asynchronous processing: task queues, job scheduling, retries, and worker management.',
                'order_index' => 7,
                'estimated_hours' => 8,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'backend',
                'title' => 'Docker & Cloud Basics',
                'description' => 'Containerization with Docker and cloud deployment basics: compute instances, managed databases, environment variables.',
                'order_index' => 8,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],

            // ══════════════════════════════════════════════════════════════════
            // BACKEND - ADVANCED LEVEL
            // ══════════════════════════════════════════════════════════════════
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'title' => 'Microservices Architecture',
                'description' => 'Service-oriented design: service boundaries, database-per-service, eventual consistency, event sourcing.',
                'order_index' => 1,
                'estimated_hours' => 15,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'title' => 'Message Queues & Event Systems',
                'description' => 'Event-driven architecture: Kafka, RabbitMQ, topics, partitions, consumers, delivery semantics.',
                'order_index' => 2,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'title' => 'API Gateways & Service Discovery',
                'description' => 'Advanced API infrastructure: Kong, NGINX, routing, rate limiting, edge authentication, service discovery.',
                'order_index' => 3,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'title' => 'Cloud Architecture & Reliability',
                'description' => 'Production cloud design: high availability, auto-scaling, load balancing, backups, multi-region strategies.',
                'order_index' => 4,
                'estimated_hours' => 15,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'title' => 'Kubernetes & Orchestration',
                'description' => 'Container orchestration: deployments, services, ingress, ConfigMaps, secrets, rolling updates, Helm.',
                'order_index' => 5,
                'estimated_hours' => 18,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'title' => 'Domain-Driven Design',
                'description' => 'Complex domain modeling: entities, value objects, aggregates, repositories, bounded contexts.',
                'order_index' => 6,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'title' => 'Observability & Monitoring',
                'description' => 'System monitoring: Prometheus, Grafana, OpenTelemetry, metrics, logs, traces, capacity planning.',
                'order_index' => 7,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'backend',
                'title' => 'Advanced Security & IAM',
                'description' => 'Enterprise security: OAuth 2.0, OpenID Connect, SSO, zero-trust, secrets management, audit logging.',
                'order_index' => 8,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],

            // ══════════════════════════════════════════════════════════════════
            // FRONTEND - BEGINNER LEVEL
            // ══════════════════════════════════════════════════════════════════
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'title' => 'HTML Fundamentals',
                'description' => 'Core HTML: semantic elements, forms, links, images, tables, and document structure.',
                'order_index' => 1,
                'estimated_hours' => 6,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'title' => 'CSS Fundamentals',
                'description' => 'CSS basics: selectors, box model, colors, typography, backgrounds, and basic layouts.',
                'order_index' => 2,
                'estimated_hours' => 8,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'title' => 'JavaScript Basics',
                'description' => 'JavaScript fundamentals: variables, data types, operators, functions, arrays, objects, and control flow.',
                'order_index' => 3,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'title' => 'DOM Manipulation',
                'description' => 'Browser DOM: selecting elements, event handling, updating content, and dynamic interactions.',
                'order_index' => 4,
                'estimated_hours' => 8,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'title' => 'Responsive Design',
                'description' => 'Mobile-first layouts: Flexbox, CSS Grid, media queries, and responsive images.',
                'order_index' => 5,
                'estimated_hours' => 8,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'title' => 'Version Control with Git',
                'description' => 'Git for frontend: repository management, branching strategies, and collaborative workflows.',
                'order_index' => 6,
                'estimated_hours' => 5,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'title' => 'Package Management & Tooling',
                'description' => 'Node.js ecosystem: npm/yarn basics, package.json, scripts, and development tools.',
                'order_index' => 7,
                'estimated_hours' => 4,
                'is_optional' => false,
            ],
            [
                'level' => 'beginner',
                'domain' => 'frontend',
                'title' => 'First Framework Project',
                'description' => 'Build your first SPA with React/Vue/Angular: components, props, and basic state management.',
                'order_index' => 8,
                'estimated_hours' => 15,
                'is_optional' => false,
            ],

            // ══════════════════════════════════════════════════════════════════
            // FRONTEND - INTERMEDIATE LEVEL
            // ══════════════════════════════════════════════════════════════════
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'title' => 'Advanced JavaScript & ES6+',
                'description' => 'Modern JavaScript: destructuring, spread/rest, modules, promises, async/await, and advanced patterns.',
                'order_index' => 1,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'title' => 'TypeScript Essentials',
                'description' => 'TypeScript fundamentals: types, interfaces, generics, strict mode, and type-safe development.',
                'order_index' => 2,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'title' => 'Framework Mastery',
                'description' => 'Deep framework knowledge: routing, hooks/composition API, context/services, and advanced component patterns.',
                'order_index' => 3,
                'estimated_hours' => 15,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'title' => 'State Management',
                'description' => 'Application state: Redux/Zustand/Pinia, global vs local state, side effects, and async data flows.',
                'order_index' => 4,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'title' => 'API Integration',
                'description' => 'Working with APIs: Fetch/Axios, REST/GraphQL clients, loading states, error handling, WebSocket basics.',
                'order_index' => 5,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'title' => 'UI/UX & Design Systems',
                'description' => 'Design collaboration: Figma basics, design tokens, component libraries, accessibility fundamentals.',
                'order_index' => 6,
                'estimated_hours' => 8,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'title' => 'Performance Optimization',
                'description' => 'Frontend performance: code splitting, lazy loading, image optimization, Lighthouse audits.',
                'order_index' => 7,
                'estimated_hours' => 8,
                'is_optional' => false,
            ],
            [
                'level' => 'intermediate',
                'domain' => 'frontend',
                'title' => 'Testing Fundamentals',
                'description' => 'Frontend testing: Jest, React Testing Library, unit tests, component tests, basic E2E with Cypress.',
                'order_index' => 8,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],

            // ══════════════════════════════════════════════════════════════════
            // FRONTEND - ADVANCED LEVEL
            // ══════════════════════════════════════════════════════════════════
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'title' => 'Advanced Rendering Strategies',
                'description' => 'Server-side rendering: Next.js/Nuxt.js, SSR, SSG, ISR, SEO optimization, hydration strategies.',
                'order_index' => 1,
                'estimated_hours' => 15,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'title' => 'Design Systems at Scale',
                'description' => 'Enterprise design systems: Storybook, design tokens, theming, accessibility at scale, documentation.',
                'order_index' => 2,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'title' => 'Advanced State Patterns',
                'description' => 'Complex state management: state machines (XState), optimistic updates, undo/redo, offline support.',
                'order_index' => 3,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'title' => 'Real-Time & Rich Interfaces',
                'description' => 'Interactive applications: WebSockets, Socket.IO, SSE, WebGL/Three.js, Canvas, animation libraries.',
                'order_index' => 4,
                'estimated_hours' => 15,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'title' => 'Frontend Security',
                'description' => 'Client-side security: CSP, XSS prevention, sanitization, secure token handling, OWASP guidelines.',
                'order_index' => 5,
                'estimated_hours' => 8,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'title' => 'Performance at Scale',
                'description' => 'Advanced performance: rendering optimization, memory leak detection, caching strategies, bundle analysis.',
                'order_index' => 6,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'title' => 'Testing Strategy & CI',
                'description' => 'Comprehensive testing: test pyramid, visual regression, CI integration, coverage strategies, Playwright.',
                'order_index' => 7,
                'estimated_hours' => 10,
                'is_optional' => false,
            ],
            [
                'level' => 'advanced',
                'domain' => 'frontend',
                'title' => 'Architecture & Leadership',
                'description' => 'Technical leadership: architecture decisions, code reviews, mentoring, migration planning, cross-team collaboration.',
                'order_index' => 8,
                'estimated_hours' => 12,
                'is_optional' => false,
            ],
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
