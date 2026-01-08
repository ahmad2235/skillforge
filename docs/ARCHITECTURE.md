# Architecture

> System design, module structure, and AI integration for SkillForge

---

## Table of Contents

- [Overview](#overview)
- [Modular Monolith Structure](#modular-monolith-structure)
- [Clean Architecture Layers](#clean-architecture-layers)
- [Module Breakdown](#module-breakdown)
- [AI Integration](#ai-integration)
- [Data Flow](#data-flow)
- [Deployment Architecture](#deployment-architecture)
- [Design Decisions](#design-decisions)

---

## Overview

SkillForge is built as a **Modular Monolith** with potential for microservices extraction. The architecture prioritizes:

- **Separation of Concerns**: Each module handles a specific domain
- **Clean Architecture**: Dependency inversion and testability
- **AI-First Design**: Pluggable AI services for evaluation and recommendations
- **Scalability**: Ready for horizontal scaling and service extraction

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React 19)                     │
│                         Vite + SPA                           │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST API
┌─────────────────────────────▼───────────────────────────────┐
│                   Backend (Laravel 12)                       │
│                    Modular Monolith                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Identity │ Learning │ Projects │Assessment│   Chat   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────┬──────────┐                                    │
│  │    AI    │Gamificat.│                                    │
│  └──────────┴──────────┘                                    │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP/Queue
┌────────────▼────────────────────────────────────────────────┐
│                    AI Microservices (FastAPI)                │
│  ┌──────────────┬─────────────────┬──────────────────────┐  │
│  │  Evaluator   │   Recommender   │   Project Leveler    │  │
│  └──────────────┴─────────────────┴──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Modular Monolith Structure

### Directory Layout

```
backend/
├── app/
│   ├── Modules/                    # Feature modules
│   │   ├── Identity/               # Auth & user management
│   │   ├── Learning/               # Roadmaps & submissions
│   │   ├── Projects/               # Business projects
│   │   ├── Assessment/             # Placement tests
│   │   ├── Gamification/           # Badges & portfolios
│   │   ├── AI/                     # AI service integration
│   │   └── Chat/                   # Real-time messaging
│   ├── Http/
│   │   └── Middleware/             # Global middleware
│   └── Models/                     # Shared Eloquent models
├── routes/
│   └── api.php                     # Module route loader
├── services/                       # External services
│   ├── chat-server/                # Socket.IO Node.js server
│   └── project-evaluator/          # Python evaluation service
└── config/                         # Laravel configuration
```

### Module Loading

All module routes are loaded from `routes/api.php`:

```php
require base_path('app/Modules/Identity/Interface/routes.php');
require base_path('app/Modules/Learning/Interface/routes.php');
require base_path('app/Modules/Projects/Interface/routes.php');
require base_path('app/Modules/Gamification/Interface/routes.php');
require base_path('app/Modules/Assessment/Interface/routes.php');
require base_path('app/Modules/Chat/Interface/routes.php');
```

---

## Clean Architecture Layers

Each module follows a four-layer architecture:

```
┌─────────────────────────────────────┐
│           Interface Layer           │  ← HTTP boundary
│   Controllers, Routes, Requests     │
└───────────────┬─────────────────────┘
                │ depends on
┌───────────────▼─────────────────────┐
│         Application Layer           │  ← Use cases
│     Services, Commands, Queries     │
└───────────────┬─────────────────────┘
                │ depends on
┌───────────────▼─────────────────────┐
│            Domain Layer             │  ← Business logic
│   Entities, Value Objects, Ports    │
└───────────────┬─────────────────────┘
                │ implemented by
┌───────────────▼─────────────────────┐
│        Infrastructure Layer         │  ← External concerns
│   Eloquent Models, API Adapters     │
└─────────────────────────────────────┘
```

### Layer Responsibilities

| Layer          | Contents                                | Rules                                    |
|----------------|----------------------------------------|------------------------------------------|
| Interface      | Controllers, FormRequests, Routes      | Only calls Application layer             |
| Application    | Services, DTOs, Use Cases              | Orchestrates domain logic                |
| Domain         | Entities, Value Objects, Repository Interfaces | No framework dependencies        |
| Infrastructure | Eloquent Models, External API Clients  | Implements Domain interfaces             |

### Example: Learning Module Structure

```
app/Modules/Learning/
├── Interface/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── StudentRoadmapController.php
│   │   │   └── StudentTaskController.php
│   │   └── Requests/
│   │       └── SubmitTaskRequest.php
│   └── routes.php
├── Application/
│   └── Services/
│       ├── RoadmapService.php
│       └── SubmissionService.php
├── Domain/
│   ├── Entities/
│   │   ├── Roadmap.php
│   │   └── Submission.php
│   └── Repositories/
│       └── SubmissionRepositoryInterface.php
└── Infrastructure/
    └── Models/
        ├── Roadmap.php
        └── Submission.php
```

---

## Module Breakdown

### Identity Module

**Purpose**: Authentication, registration, and role management

**Key Components**:
- User registration with role selection (student/business)
- Laravel Sanctum token authentication
- Password reset flow
- Email verification

**Routes**: `/auth/*`

### Learning Module

**Purpose**: Student learning pathways and task submissions

**Key Components**:
- Roadmaps organized by domain and level
- Blocks with sequential tasks
- Submission handling with AI evaluation
- Progress tracking

**Routes**: `/student/roadmap/*`, `/student/tasks/*`

### Projects Module

**Purpose**: Business project management and assignments

**Key Components**:
- Project CRUD for business owners
- Candidate invitation system (single & multi-invite)
- Assignment lifecycle management
- First-accept-wins logic

**Routes**: `/business/projects/*`, `/student/projects/*`

### Assessment Module

**Purpose**: Placement tests and skill assessment

**Key Components**:
- Domain-specific question banks
- Timed test delivery
- Automatic level assignment
- Answer validation and scoring

**Routes**: `/student/assessment/*`

### Gamification Module

**Purpose**: Badges, portfolios, and achievements

**Key Components**:
- Badge definitions and awarding logic
- Portfolio generation from submissions
- PDF export functionality
- Achievement tracking

**Routes**: `/student/portfolio/*`, `/student/badges/*`

### AI Module

**Purpose**: Integration layer for AI services

**Key Components**:
- `TaskEvaluationService`: Score submissions
- `RecommendationService`: Rank candidates

**No direct routes** - called by other modules

### Chat Module

**Purpose**: Real-time 1-to-1 messaging

**Key Components**:
- Conversation management
- Message persistence
- Socket.IO integration
- Sanctum token validation

**Routes**: `/chat/*`

---

## AI Integration

### Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Laravel Backend                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AI Module (app/Modules/AI)              │    │
│  │  ┌──────────────────┐  ┌──────────────────────────┐ │    │
│  │  │TaskEvaluationSvc │  │  RecommendationService   │ │    │
│  │  └────────┬─────────┘  └───────────┬──────────────┘ │    │
│  └───────────┼────────────────────────┼────────────────┘    │
└──────────────┼────────────────────────┼─────────────────────┘
               │ HTTP                   │ HTTP
┌──────────────▼──────────┐ ┌───────────▼─────────────────────┐
│   Project Evaluator     │ │      Cosine Recommender         │
│   (FastAPI - Python)    │ │      (FastAPI - Python)         │
│   Port: 8001            │ │      Port: 8002                 │
└─────────────────────────┘ └─────────────────────────────────┘
```

### TaskEvaluationService

**Contract** (must remain stable):

```php
interface TaskEvaluationServiceInterface
{
    public function evaluateSubmission(Submission $submission): array;
}

// Returns:
[
    'score'    => int|null,      // 0-100
    'feedback' => string|null,   // Student-facing feedback
    'metadata' => array          // Additional evaluation data
]
```

**Called by**: `RoadmapService::submitTask()`

### RecommendationService

**Contract** (must remain stable):

```php
interface RecommendationServiceInterface
{
    public function rankCandidates(Project $project, Collection $candidates): array;
}

// Returns:
[
    [
        'student' => User,    // User model instance
        'score'   => int,     // Ranking score
        'reason'  => string   // Explanation
    ],
    // ...
]
```

**Called by**: `OwnerProjectAssignmentController::candidates()`

### PDF Project Leveler

**Purpose**: Analyze uploaded project PDFs to determine complexity

**Endpoint**: `POST /api/leveler/analyze`

**Input**: PDF file upload

**Output**: Project complexity level and skill requirements

---

## Data Flow

### Student Submission Flow

```
1. Student submits task
   POST /student/tasks/{id}/submit
            │
2. Controller validates request
   SubmitTaskRequest validates input
            │
3. Service processes submission
   RoadmapService::submitTask()
            │
4. Submission saved to database
   Submission model created
            │
5. AI evaluation triggered (async)
   TaskEvaluationService::evaluateSubmission()
            │
6. External AI service called
   HTTP to Project Evaluator (FastAPI)
            │
7. Score & feedback stored
   Submission updated with results
            │
8. Response returned to student
   JSON with submission details
```

### Project Assignment Flow

```
1. Business owner requests candidates
   GET /business/projects/{id}/candidates
            │
2. Eligible candidates fetched
   Students matching domain/level
            │
3. AI ranking requested
   RecommendationService::rankCandidates()
            │
4. External AI service called
   HTTP to Cosine Recommender (FastAPI)
            │
5. Ranked list returned
   Sorted by AI score with reasons
            │
6. Business owner sends invite
   POST /business/projects/assignments/invite
            │
7. Student accepts invitation
   POST /student/projects/assignments/{id}/accept
            │
8. Assignment created
   Project assigned to student
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Machine                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ php artisan  │  │  npm run dev │  │   npm start  │       │
│  │    serve     │  │   (Vite)     │  │ (chat-server)│       │
│  │  :8000       │  │   :5173      │  │    :3001     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   uvicorn    │  │   uvicorn    │  │   uvicorn    │       │
│  │  evaluator   │  │ recommender  │  │   leveler    │       │
│  │   :8001      │  │    :8002     │  │    :8003     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   MySQL :3306                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                     │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
┌───────────────▼───────────────┐ ┌───────────▼───────────────┐
│   Web Servers (Laravel)       │ │   Static Assets (CDN)     │
│   - PHP-FPM                   │ │   - React build           │
│   - Nginx                     │ │   - Images/CSS/JS         │
└───────────────┬───────────────┘ └───────────────────────────┘
                │
┌───────────────▼───────────────────────────────────────────┐
│                    Service Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Chat Server  │  │ AI Services │  │Queue Worker │        │
│  │(Socket.IO)  │  │  (FastAPI)  │  │ (Laravel)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└───────────────────────────┬───────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────┐
│                    Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   MySQL     │  │    Redis    │  │   Storage   │        │
│  │  (Primary)  │  │   (Cache)   │  │   (S3/Disk) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└───────────────────────────────────────────────────────────┘
```

<!-- Placeholder: Add detailed deployment diagram -->

---

## Design Decisions

### Why Modular Monolith?

1. **Simpler deployment** than microservices
2. **Shared database** reduces complexity
3. **Easy refactoring** with module extraction
4. **Team scalability** - different teams per module

### Why Clean Architecture?

1. **Testability** - Business logic isolated from framework
2. **Flexibility** - Easy to swap implementations
3. **Maintainability** - Clear boundaries and dependencies

### Why FastAPI for AI Services?

1. **Python ecosystem** - ML libraries availability
2. **Performance** - Async support for I/O bound tasks
3. **Type safety** - Pydantic validation
4. **Decoupling** - AI can scale independently

### Why Socket.IO for Chat?

1. **Real-time** - Bidirectional communication
2. **Fallback** - Graceful degradation to polling
3. **Ecosystem** - Wide library support
4. **Scalability** - Redis adapter for multi-server

---

## Future Considerations

### Potential Microservices Extraction

- **Assessment Module**: High traffic during test periods
- **AI Module**: GPU-intensive operations
- **Chat Module**: Already partially extracted (Socket.IO)

### Scalability Improvements

- Redis caching for frequently accessed data
- Read replicas for database scaling
- CDN for static assets
- Container orchestration (Kubernetes)

---

**Last Updated**: January 2026
