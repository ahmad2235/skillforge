# SkillForge

> AI-powered tutoring, assessment, and developer-ranking platform

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture Summary](#architecture-summary)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

**SkillForge** is an AI-powered platform designed to:

- Tutor students through personalized learning roadmaps
- Assess developer skills via placement tests
- Rank and recommend candidates for business projects
- Connect students with real-world project opportunities

### Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Laravel 12 (Modular Monolith)       |
| Frontend   | React 19 + Vite                     |
| Database   | MySQL / PostgreSQL                  |
| AI Services| FastAPI microservices (Python)      |
| Real-time  | Socket.IO (Node.js chat server)     |
| Auth       | Laravel Sanctum (Bearer tokens)     |

---

## Key Features

### For Students
- **Learning Roadmaps**: Structured pathways with blocks, tasks, and AI-evaluated submissions
- **Placement Tests**: Assess skill level (beginner/intermediate/advanced) per domain
- **Portfolio & Badges**: Gamification features showcasing achievements
- **Project Assignments**: Get invited to real business projects

### For Business Owners
- **Project Management**: Create projects and define requirements
- **Candidate Ranking**: AI-powered recommendations for best-fit students
- **Multi-Invite System**: Invite multiple candidates with first-accept-wins logic
- **Real-time Chat**: Direct communication with assigned students

### For Admins
- **User Management**: Full CRUD for users, roles, and permissions
- **Content Moderation**: Review and manage learning content
- **Analytics Dashboard**: Platform-wide statistics and reports

---

## Architecture Summary

SkillForge uses a **Modular Monolith** architecture with Clean Architecture principles:

```
backend/app/Modules/
├── Identity/       # Authentication, registration, roles
├── Learning/       # Roadmaps, blocks, tasks, submissions
├── Projects/       # Business projects, assignments, invitations
├── Gamification/   # Badges, portfolios
├── Assessment/     # Placement tests, questions, attempts
├── AI/             # Task evaluation & candidate ranking hooks
└── Chat/           # Real-time 1-to-1 messaging
```

### AI Microservices

| Service              | Purpose                              | Technology |
|----------------------|--------------------------------------|------------|
| Project Evaluator    | Score student code submissions       | FastAPI    |
| Cosine Recommender   | Rank candidates for projects         | FastAPI    |
| PDF Project Leveler  | Analyze project complexity           | FastAPI    |

> See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams and explanations.

---

## Getting Started

### Prerequisites

- PHP 8.2+ with Composer
- Node.js 18+ with npm
- MySQL 8.0+ or PostgreSQL
- Python 3.10+ (for AI services)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/skillforge.git
cd skillforge

# Backend setup
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

> See [INSTALLATION.md](INSTALLATION.md) for complete setup instructions.

---

## Documentation

| Document                                      | Description                                |
|-----------------------------------------------|--------------------------------------------|
| [INSTALLATION.md](INSTALLATION.md)            | Setup instructions for all components      |
| [USAGE.md](USAGE.md)                          | User workflows and API usage examples      |
| [ARCHITECTURE.md](ARCHITECTURE.md)            | System design and module structure         |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md)  | Complete API reference with examples       |
| [CONFIGURATION.md](CONFIGURATION.md)          | Environment variables and config options   |
| [TESTING.md](TESTING.md)                      | Running tests and debugging                |
| [CONTRIBUTING.md](CONTRIBUTING.md)            | How to contribute to the project           |
| [CHANGELOG.md](CHANGELOG.md)                  | Version history and release notes          |
| [SECURITY.md](SECURITY.md)                    | Security policy and best practices         |

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Code standards and formatting guidelines
- Pull request process
- Issue reporting guidelines

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Notes

<!-- Placeholder for diagrams -->
<!-- TODO: Add system architecture diagram -->
<!-- TODO: Add user flow screenshots -->
<!-- TODO: Add demo video link -->

**Last Updated**: January 2026
