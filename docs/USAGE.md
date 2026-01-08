# Usage Guide

> User workflows, API usage, and best practices for SkillForge

---

## Table of Contents

- [User Roles](#user-roles)
- [Student Workflows](#student-workflows)
- [Business Owner Workflows](#business-owner-workflows)
- [Admin Workflows](#admin-workflows)
- [API Overview](#api-overview)
- [Example Requests](#example-requests)
- [Best Practices](#best-practices)

---

## User Roles

SkillForge supports three user roles with distinct permissions:

| Role     | Description                                    | Route Prefix  |
|----------|------------------------------------------------|---------------|
| Student  | Learners who complete roadmaps and tasks       | `/student`    |
| Business | Project owners who hire students               | `/business`   |
| Admin    | System administrators with full access         | `/admin`      |

---

## Student Workflows

### 1. Registration & Placement Test

```
Register → Verify Email → Take Placement Test → Get Level Assignment
```

1. Create account with `name`, `email`, `password`, `domain` (frontend/backend)
2. Complete email verification
3. Take placement test to determine skill level
4. System assigns level: `beginner`, `intermediate`, or `advanced`

### 2. Learning Roadmap

```
View Roadmap → Complete Blocks → Submit Tasks → Get AI Evaluation
```

1. Access assigned roadmap based on domain and level
2. Work through blocks sequentially
3. Submit code/answers for each task
4. Receive AI-generated feedback and scores

### 3. Project Assignment

```
Receive Invite → Review Project → Accept/Decline → Work on Project
```

1. Business owners send project invitations
2. Review project requirements and deadlines
3. Accept invitation (first-accept-wins for multi-invites)
4. Communicate via chat and complete deliverables

### 4. Portfolio & Badges

```
Complete Tasks → Earn Badges → Build Portfolio → Export PDF
```

1. Badges awarded for milestones (tasks completed, scores achieved)
2. Portfolio automatically populated from submissions
3. Export portfolio as PDF for job applications

---

## Business Owner Workflows

### 1. Project Creation

```
Create Project → Define Requirements → Set Deadline → Publish
```

1. Provide project title, description, and requirements
2. Specify required skills (domain, level)
3. Set deadline and budget (optional)
4. Publish to make visible for candidate matching

### 2. Candidate Selection

```
View Recommendations → Review Candidates → Send Invites
```

1. AI ranks candidates based on skills and portfolio
2. Review candidate profiles and past submissions
3. Send invitations to preferred candidates
4. Track invitation status (pending/accepted/declined)

### 3. Multi-Invite System

```
Select Multiple Candidates → Send Batch Invite → First Accept Wins
```

1. Select up to N candidates for same project
2. System sends invitations to all simultaneously
3. First student to accept gets the assignment
4. All other pending invites auto-cancelled

### 4. Project Management

```
Monitor Progress → Chat with Student → Review Deliverables → Mark Complete
```

1. Track assigned student's progress
2. Use real-time chat for communication
3. Review and provide feedback on deliverables
4. Mark project as completed

---

## Admin Workflows

### 1. User Management

- View all users with filtering and search
- Edit user roles and permissions
- Suspend or delete accounts
- Reset passwords

### 2. Content Management

- Create and edit learning roadmaps
- Manage blocks, tasks, and questions
- Review and moderate submissions
- Update placement test questions

### 3. Analytics & Reports

- View platform statistics
- Monitor user activity
- Generate reports on completion rates
- Track AI service performance

---

## API Overview

### Base URL

```
Development: http://localhost:8000/api
Production:  https://api.skillforge.app/api
```

### Authentication

All protected endpoints require Bearer token:

```
Authorization: Bearer <token>
```

### Route Prefixes

| Prefix       | Description           | Auth Required |
|--------------|-----------------------|---------------|
| `/auth`      | Authentication        | No (mostly)   |
| `/student`   | Student endpoints     | Yes + role    |
| `/business`  | Business endpoints    | Yes + role    |
| `/admin`     | Admin endpoints       | Yes + role    |
| `/chat`      | Chat endpoints        | Yes           |

> See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete reference.

---

## Example Requests

### Authentication

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "password_confirmation": "securepassword123",
  "role": "student",
  "domain": "backend"
}
```

**Response:**

```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  },
  "token": "1|abc123..."
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Student Endpoints

#### Get Roadmap

```http
GET /api/student/roadmap
Authorization: Bearer <token>
```

#### Submit Task

```http
POST /api/student/tasks/{taskId}/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "function solution() { return 42; }",
  "notes": "Implemented using recursive approach"
}
```

**Response:**

```json
{
  "submission": {
    "id": 123,
    "score": 85,
    "feedback": "Good solution! Consider edge cases.",
    "status": "evaluated"
  }
}
```

### Business Endpoints

#### Create Project

```http
POST /api/business/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "E-commerce API Development",
  "description": "Build REST API for online store",
  "domain": "backend",
  "required_level": "intermediate",
  "deadline": "2026-02-15"
}
```

#### Get Candidate Recommendations

```http
GET /api/business/projects/{projectId}/candidates
Authorization: Bearer <token>
```

#### Send Multi-Invite

```http
POST /api/business/projects/assignments/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": 1,
  "user_ids": [5, 8, 12]
}
```

---

## Best Practices

### For API Consumers

1. **Always include Authorization header** for protected routes
2. **Handle rate limits** (429 status) with exponential backoff
3. **Validate responses** before processing
4. **Use pagination** for list endpoints (`?page=1&per_page=20`)

### For Students

1. **Complete placement test** before accessing roadmaps
2. **Submit tasks incrementally** - don't wait until completion
3. **Review AI feedback** and iterate on submissions
4. **Keep portfolio updated** for better project matches

### For Business Owners

1. **Provide detailed project descriptions** for better AI matching
2. **Use multi-invite** for time-sensitive projects
3. **Respond promptly** to candidate questions via chat
4. **Leave reviews** after project completion

### Special Cases

#### Rate Limiting

- Login: 5 requests/minute per email
- Registration: 3 requests/minute per IP
- Submissions: 10 requests/minute per user
- General API: 60 requests/minute per user

#### File Uploads

- Maximum size: 5MB
- Allowed types: jpeg, jpg, png, pdf, zip
- Use multipart/form-data for uploads

#### Pagination

```http
GET /api/student/submissions?page=2&per_page=15
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "meta": {
    "current_page": 2,
    "per_page": 15,
    "total": 45,
    "last_page": 3
  }
}
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning               | Action                        |
|------|-----------------------|-------------------------------|
| 200  | Success               | Process response              |
| 201  | Created               | Resource created successfully |
| 400  | Bad Request           | Check request format          |
| 401  | Unauthorized          | Login or refresh token        |
| 403  | Forbidden             | Check user permissions        |
| 404  | Not Found             | Resource doesn't exist        |
| 422  | Validation Error      | Fix request data              |
| 429  | Too Many Requests     | Wait and retry                |
| 500  | Server Error          | Contact support               |

### Error Response Format

```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

---

## Next Steps

- Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete endpoint reference
- Check [CONFIGURATION.md](CONFIGURATION.md) for environment setup
- See [TESTING.md](TESTING.md) for testing your integration

---

**Last Updated**: January 2026
