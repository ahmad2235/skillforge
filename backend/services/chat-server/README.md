# SkillForge Chat Server

Real-time Socket.IO server for SkillForge chat system.

## System Contract

This chat system supports ONLY:
- 1-to-1 messaging
- student ↔ business owner
- real-time delivery
- permanent storage
- max ~100 concurrent users

**NOT SUPPORTED:**
- No edits
- No deletes
- No groups
- No attachments
- No typing indicators
- No presence / online status
- No read receipts

## Prerequisites

- Node.js 18+
- MySQL running with SkillForge database
- Laravel backend running (for auth tokens)

## Installation

```bash
cd backend/services/chat-server
npm install
```

## Configuration

The server reads from the Laravel `.env` file (two directories up). Key variables:

```env
# Database (inherited from Laravel)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skillforge
DB_USERNAME=root
DB_PASSWORD=your_password

# Chat server specific (optional)
CHAT_SERVER_PORT=3001
CHAT_CORS_ORIGIN=http://localhost:5173
```

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## Authentication

The server validates Laravel Sanctum Bearer tokens:

1. Client connects with `?token=<SANCTUM_BEARER_TOKEN>`
2. Server hashes token using SHA-256
3. Server looks up hash in `personal_access_tokens` table
4. Server verifies user is active and has role `student` or `business`
5. User identity attached to socket connection

**CRITICAL:** Token validation happens ONCE on connection. User identity is trusted for the lifetime of the socket.

## Socket Events

### Client → Server

#### `send_message`
```json
{
  "tempId": "uuid-generated-by-client",
  "conversationId": 123,
  "text": "Hello!"
}
```

### Server → Client

#### `receive_message`
```json
{
  "id": 456,
  "conversationId": 123,
  "senderId": 9,
  "text": "Hello!",
  "createdAt": "2025-12-30T12:00:00.000Z",
  "tempId": "uuid-if-sender"
}
```

#### `error`
```json
{
  "tempId": "uuid-if-available",
  "reason": "Error description"
}
```

## Security

- Sanctum token validation
- Role-based access (student/business only)
- Conversation ownership verification on every message
- Input sanitization (strip HTML tags)
- Rate limiting (5 messages/second/user)

## Architecture

```
Client (React)
    ↓ wss://localhost:3001?token=XXX
Socket.IO Server (Node.js)
    ↓ MySQL connection pool
Laravel Database (MySQL)
```

The Socket.IO server is a separate process from Laravel. It shares the same database and validates against Laravel's Sanctum token table.
