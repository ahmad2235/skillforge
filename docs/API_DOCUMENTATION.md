# API Documentation

> Complete API reference for SkillForge

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Auth Endpoints](#auth-endpoints)
- [Student Endpoints](#student-endpoints)
- [Business Endpoints](#business-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Chat Endpoints](#chat-endpoints)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

---

## Overview

### Base URL

```
Development: http://localhost:8000/api
Production:  https://api.skillforge.app/api
```

### Request Format

- Content-Type: `application/json`
- Accept: `application/json`

### Response Format

All responses follow this structure:

```json
{
  "data": { },           // Response payload
  "message": "Success",  // Human-readable message
  "meta": { }            // Pagination or metadata (optional)
}
```

### HTTP Methods

| Method | Purpose                          |
|--------|----------------------------------|
| GET    | Retrieve resource(s)             |
| POST   | Create new resource              |
| PUT    | Update entire resource           |
| PATCH  | Partial update                   |
| DELETE | Remove resource                  |

---

## Authentication

### Bearer Token

All protected endpoints require authentication via Bearer token:

```http
Authorization: Bearer <token>
```

### Obtaining a Token

Tokens are returned from `/auth/login` and `/auth/register` endpoints.

### Token Expiration

- Default expiration: 7 days
- Tokens can be revoked via `/auth/logout`

---

## Auth Endpoints

### Register

Create a new user account.

```http
POST /api/auth/register
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "student",
  "domain": "backend"
}
```

| Field                   | Type   | Required | Description                          |
|-------------------------|--------|----------|--------------------------------------|
| name                    | string | Yes      | User's full name                     |
| email                   | string | Yes      | Valid email address                  |
| password                | string | Yes      | Min 8 characters                     |
| password_confirmation   | string | Yes      | Must match password                  |
| role                    | string | Yes      | `student` or `business`              |
| domain                  | string | Conditional | Required for students: `frontend`/`backend` |

**Response: 201 Created**

```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "domain": "backend"
  },
  "token": "1|abc123xyz..."
}
```

---

### Login

Authenticate and receive access token.

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response: 200 OK**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  },
  "token": "2|def456abc..."
}
```

**Response: 401 Unauthorized**

```json
{
  "message": "Invalid credentials"
}
```

---

### Logout

Revoke current access token.

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User

Retrieve authenticated user's profile.

```http
GET /api/auth/user
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "domain": "backend",
    "level": "intermediate",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### Password Reset Request

Request password reset email.

```http
POST /api/auth/password/email
```

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

**Response: 200 OK**

```json
{
  "message": "Password reset link sent"
}
```

---

### Password Reset

Reset password with token.

```http
POST /api/auth/password/reset
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "token": "reset-token-from-email",
  "password": "newpassword123",
  "password_confirmation": "newpassword123"
}
```

**Response: 200 OK**

```json
{
  "message": "Password reset successful"
}
```

---

## Student Endpoints

### Roadmap

#### Get Assigned Roadmap

```http
GET /api/student/roadmap
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "roadmap": {
    "id": 1,
    "title": "Backend Development - Intermediate",
    "domain": "backend",
    "level": "intermediate",
    "blocks": [
      {
        "id": 1,
        "title": "Database Fundamentals",
        "order": 1,
        "tasks": [
          {
            "id": 1,
            "title": "SQL Basics",
            "description": "Write basic SQL queries",
            "type": "code",
            "status": "completed",
            "score": 85
          }
        ]
      }
    ]
  }
}
```

---

### Tasks

#### Get Task Details

```http
GET /api/student/tasks/{taskId}
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "task": {
    "id": 1,
    "title": "SQL Basics",
    "description": "Write queries to retrieve user data",
    "type": "code",
    "instructions": "1. Write a SELECT query...",
    "expected_output": "user_id, name, email",
    "submission": {
      "id": 5,
      "content": "SELECT * FROM users",
      "score": 85,
      "feedback": "Good query structure",
      "submitted_at": "2026-01-05T10:00:00Z"
    }
  }
}
```

---

#### Submit Task

```http
POST /api/student/tasks/{taskId}/submit
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "content": "SELECT user_id, name, email FROM users WHERE active = 1;",
  "notes": "Added filter for active users"
}
```

**Response: 201 Created**

```json
{
  "submission": {
    "id": 10,
    "task_id": 1,
    "content": "SELECT user_id, name, email FROM users WHERE active = 1;",
    "status": "pending",
    "submitted_at": "2026-01-08T12:00:00Z"
  },
  "message": "Submission received. Evaluation in progress."
}
```

**Response after evaluation (async):**

```json
{
  "submission": {
    "id": 10,
    "status": "evaluated",
    "score": 90,
    "feedback": "Excellent query! Consider adding an index for the active column."
  }
}
```

---

### Assessment (Placement Test)

#### Get Placement Test

```http
GET /api/student/assessment/placement
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "test": {
    "id": 1,
    "domain": "backend",
    "duration_minutes": 30,
    "questions_count": 20,
    "questions": [
      {
        "id": 1,
        "text": "What is the purpose of an index in a database?",
        "type": "multiple_choice",
        "options": [
          { "id": "a", "text": "To store data" },
          { "id": "b", "text": "To speed up queries" },
          { "id": "c", "text": "To encrypt data" },
          { "id": "d", "text": "To backup data" }
        ]
      }
    ]
  }
}
```

---

#### Submit Placement Test

```http
POST /api/student/assessment/placement/submit
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "answers": [
    { "question_id": 1, "answer": "b" },
    { "question_id": 2, "answer": "c" }
  ]
}
```

**Response: 200 OK**

```json
{
  "result": {
    "score": 75,
    "level": "intermediate",
    "feedback": "You have strong fundamentals. Focus on advanced optimization."
  }
}
```

---

### Portfolio

#### Get Portfolio

```http
GET /api/student/portfolio
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "portfolio": {
    "user": {
      "name": "John Doe",
      "domain": "backend",
      "level": "intermediate"
    },
    "badges": [
      { "id": 1, "name": "First Submission", "earned_at": "2026-01-02" }
    ],
    "projects": [
      { "id": 1, "title": "E-commerce API", "status": "completed" }
    ],
    "submissions": [
      { "id": 10, "task_title": "SQL Basics", "score": 90 }
    ]
  }
}
```

---

#### Export Portfolio as PDF

```http
GET /api/student/portfolio/export
Authorization: Bearer <token>
Accept: application/pdf
```

**Response: 200 OK**

Returns PDF file download.

---

### Project Assignments

#### Get My Invitations

```http
GET /api/student/projects/invitations
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "invitations": [
    {
      "id": 1,
      "project": {
        "id": 5,
        "title": "E-commerce API",
        "description": "Build REST API for online store"
      },
      "status": "pending",
      "invited_at": "2026-01-07T10:00:00Z",
      "expires_at": "2026-01-14T10:00:00Z"
    }
  ]
}
```

---

#### Accept Invitation

```http
POST /api/student/projects/assignments/{assignmentId}/accept
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "token": "invitation-token-from-email"
}
```

**Response: 200 OK**

```json
{
  "message": "Assignment accepted",
  "assignment": {
    "id": 1,
    "status": "accepted",
    "project": {
      "id": 5,
      "title": "E-commerce API"
    }
  }
}
```

**Response: 409 Conflict** (if already accepted by another student)

```json
{
  "message": "This project has already been assigned to another student"
}
```

---

#### Decline Invitation

```http
POST /api/student/projects/assignments/{assignmentId}/decline
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "message": "Invitation declined"
}
```

---

## Business Endpoints

### Projects

#### List My Projects

```http
GET /api/business/projects
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "projects": [
    {
      "id": 5,
      "title": "E-commerce API",
      "description": "Build REST API for online store",
      "status": "active",
      "domain": "backend",
      "required_level": "intermediate",
      "deadline": "2026-02-15",
      "assigned_student": null
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 5
  }
}
```

---

#### Create Project

```http
POST /api/business/projects
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "E-commerce API",
  "description": "Build REST API for online store with user auth, products, cart, and orders",
  "domain": "backend",
  "required_level": "intermediate",
  "deadline": "2026-02-15",
  "requirements": [
    "Laravel 10+",
    "MySQL database",
    "RESTful design",
    "JWT authentication"
  ]
}
```

**Response: 201 Created**

```json
{
  "project": {
    "id": 5,
    "title": "E-commerce API",
    "status": "draft"
  },
  "message": "Project created successfully"
}
```

---

#### Update Project

```http
PUT /api/business/projects/{projectId}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "E-commerce API v2",
  "deadline": "2026-03-01"
}
```

**Response: 200 OK**

```json
{
  "project": {
    "id": 5,
    "title": "E-commerce API v2"
  },
  "message": "Project updated"
}
```

---

#### Delete Project

```http
DELETE /api/business/projects/{projectId}
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "message": "Project deleted"
}
```

---

### Candidate Management

#### Get Candidate Recommendations

```http
GET /api/business/projects/{projectId}/candidates
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "candidates": [
    {
      "id": 10,
      "name": "Jane Smith",
      "level": "intermediate",
      "domain": "backend",
      "score": 92,
      "reason": "High completion rate, strong SQL submissions",
      "portfolio_url": "/api/student/10/portfolio"
    },
    {
      "id": 15,
      "name": "Bob Johnson",
      "level": "intermediate",
      "domain": "backend",
      "score": 87,
      "reason": "Completed similar e-commerce project"
    }
  ]
}
```

---

#### Send Invitation (Single)

```http
POST /api/business/projects/assignments/invite
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "project_id": 5,
  "user_id": 10
}
```

**Response: 201 Created**

```json
{
  "assignment": {
    "id": 20,
    "status": "pending",
    "invited_at": "2026-01-08T10:00:00Z"
  },
  "message": "Invitation sent"
}
```

---

#### Send Multi-Invite

```http
POST /api/business/projects/assignments/invite
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "project_id": 5,
  "user_ids": [10, 15, 22]
}
```

**Response: 201 Created**

```json
{
  "assignments": [
    { "id": 20, "user_id": 10, "status": "pending" },
    { "id": 21, "user_id": 15, "status": "pending" },
    { "id": 22, "user_id": 22, "status": "pending" }
  ],
  "message": "3 invitations sent. First to accept will be assigned."
}
```

---

#### Cancel Invitation

```http
DELETE /api/business/projects/assignments/{assignmentId}/cancel
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "message": "Invitation cancelled"
}
```

---

## Admin Endpoints

### User Management

#### List Users

```http
GET /api/admin/users
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type   | Description                     |
|-----------|--------|---------------------------------|
| role      | string | Filter by role                  |
| search    | string | Search by name or email         |
| page      | int    | Page number                     |
| per_page  | int    | Items per page (max 100)        |

**Response: 200 OK**

```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

---

#### Update User

```http
PUT /api/admin/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "role": "business",
  "level": "advanced"
}
```

**Response: 200 OK**

```json
{
  "user": {
    "id": 1,
    "role": "business"
  },
  "message": "User updated"
}
```

---

#### Delete User

```http
DELETE /api/admin/users/{userId}
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "message": "User deleted"
}
```

---

## Chat Endpoints

### Conversations

#### List Conversations

```http
GET /api/chat/conversations
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "conversations": [
    {
      "id": 1,
      "participant": {
        "id": 5,
        "name": "Business Owner",
        "role": "business"
      },
      "last_message": {
        "text": "Let's discuss the project",
        "sent_at": "2026-01-08T10:00:00Z"
      },
      "unread_count": 2
    }
  ]
}
```

---

#### Create/Get Conversation

```http
POST /api/chat/conversations
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "participant_id": 5
}
```

**Response: 200 OK** (existing) or **201 Created** (new)

```json
{
  "conversation": {
    "id": 1,
    "participant": {
      "id": 5,
      "name": "Business Owner"
    }
  }
}
```

---

#### Get Messages

```http
GET /api/chat/conversations/{conversationId}/messages
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description          |
|-----------|------|----------------------|
| page      | int  | Page number          |
| per_page  | int  | Messages per page    |

**Response: 200 OK**

```json
{
  "messages": [
    {
      "id": 100,
      "sender_id": 5,
      "text": "Hello, interested in the project?",
      "created_at": "2026-01-08T09:00:00Z"
    },
    {
      "id": 101,
      "sender_id": 1,
      "text": "Yes, I'd love to discuss further",
      "created_at": "2026-01-08T09:05:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 50
  }
}
```

---

#### Send Message (REST fallback)

```http
POST /api/chat/conversations/{conversationId}/messages
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "text": "Looking forward to working together!"
}
```

**Response: 201 Created**

```json
{
  "message": {
    "id": 102,
    "text": "Looking forward to working together!",
    "created_at": "2026-01-08T10:00:00Z"
  }
}
```

---

### Socket.IO Events

| Event            | Direction | Payload                                        |
|------------------|-----------|------------------------------------------------|
| `send_message`   | C → S     | `{ tempId, conversationId, text }`             |
| `receive_message`| S → C     | `{ id, conversationId, senderId, text, createdAt }` |
| `error`          | S → C     | `{ tempId?, reason }`                          |

---

## Error Codes

### HTTP Status Codes

| Code | Name                  | Description                              |
|------|-----------------------|------------------------------------------|
| 200  | OK                    | Request successful                       |
| 201  | Created               | Resource created                         |
| 204  | No Content            | Successful, no response body             |
| 400  | Bad Request           | Invalid request format                   |
| 401  | Unauthorized          | Authentication required                  |
| 403  | Forbidden             | Access denied                            |
| 404  | Not Found             | Resource not found                       |
| 409  | Conflict              | Resource conflict (e.g., duplicate)      |
| 422  | Unprocessable Entity  | Validation failed                        |
| 429  | Too Many Requests     | Rate limit exceeded                      |
| 500  | Internal Server Error | Server error                             |

### Error Response Format

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": [
      "The email field is required.",
      "The email must be a valid email address."
    ],
    "password": [
      "The password must be at least 8 characters."
    ]
  }
}
```

---

## Rate Limiting

| Endpoint Group    | Limit              | Window      |
|-------------------|--------------------|-------------|
| /auth/login       | 5 requests         | Per minute  |
| /auth/register    | 3 requests         | Per minute  |
| /student/*        | 60 requests        | Per minute  |
| /business/*       | 60 requests        | Per minute  |
| /admin/*          | 100 requests       | Per minute  |
| Global (per IP)   | 1000 requests      | Per minute  |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1704672000
```

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

```json
{
  "message": "Too many requests. Please retry after 30 seconds."
}
```

---

## Pagination

### Query Parameters

```http
GET /api/resource?page=2&per_page=20
```

### Response Metadata

```json
{
  "data": [...],
  "meta": {
    "current_page": 2,
    "per_page": 20,
    "total": 100,
    "last_page": 5,
    "from": 21,
    "to": 40
  },
  "links": {
    "first": "/api/resource?page=1",
    "last": "/api/resource?page=5",
    "prev": "/api/resource?page=1",
    "next": "/api/resource?page=3"
  }
}
```

---

**Last Updated**: January 2026
