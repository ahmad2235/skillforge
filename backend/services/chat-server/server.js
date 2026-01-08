/**
 * SOCKET.IO CHAT SERVER
 * 
 * PURPOSE: Real-time message delivery for SkillForge chat.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - 1-to-1 messaging ONLY (student ↔ business)
 * - No groups, no broadcasts, no typing indicators
 * - No edits, no deletes (append-only)
 * - No attachments, no read receipts
 * - Max ~100 concurrent users
 * - Messages persisted to MySQL BEFORE delivery
 * 
 * AUTHENTICATION:
 * - Sanctum Bearer token passed via query param: ?token=<TOKEN>
 * - Token validated ONCE on connection
 * - User identity attached to socket (socket.userId, socket.role)
 * - NO per-message authentication
 * 
 * ROOMS STRATEGY:
 * - Each socket joins exactly ONE room: user:{userId}
 * - Messages emitted to sender AND receiver rooms
 * - NO conversation rooms (simplifies state management)
 * 
 * MESSAGE LIFECYCLE:
 * 1. Client sends send_message with tempId
 * 2. Server validates sender is participant
 * 3. Server persists message to MySQL
 * 4. Server emits receive_message to BOTH users
 * 5. Client replaces tempId with DB id
 * 
 * ERROR HANDLING:
 * - All errors emitted to sender ONLY
 * - Never emit to receiver on failure
 * - Never fail silently
 */

require('dotenv').config({ path: '../../.env' });

const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const { validateToken } = require('./auth');

// Configuration from environment
const PORT = process.env.CHAT_SERVER_PORT || 3001;
const CORS_ORIGIN = process.env.CHAT_CORS_ORIGIN || 'http://localhost:5173';

// MySQL configuration (matches Laravel .env)
const DB_CONFIG = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'skillforge',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

// Create MySQL connection pool
let db;

/**
 * Initialize MySQL connection pool.
 * 
 * WHY POOL:
 * - Reuses connections (faster than connect per query)
 * - Handles connection failures gracefully
 * - Limits max connections to prevent DB overload
 */
async function initDatabase() {
    try {
        db = mysql.createPool(DB_CONFIG);
        // Test connection
        await db.execute('SELECT 1');
        console.log('[DB] MySQL connection pool initialized');
    } catch (error) {
        console.error('[DB] Failed to initialize MySQL:', error.message);
        process.exit(1);
    }
}

/**
 * Verify user is a participant in the conversation.
 * 
 * WHY THIS CHECK:
 * - Prevents message spoofing to conversations user doesn't belong to
 * - Enforced on EVERY message send
 * 
 * @param {number} conversationId 
 * @param {number} userId 
 * @returns {Promise<{valid: boolean, otherUserId?: number}>}
 */
async function verifyConversationAccess(conversationId, userId) {
    try {
        const [rows] = await db.execute(`
            SELECT student_id, owner_id
            FROM conversations
            WHERE id = ?
            LIMIT 1
        `, [conversationId]);

        if (rows.length === 0) {
            return { valid: false };
        }

        const conv = rows[0];
        
        if (conv.student_id === userId) {
            return { valid: true, otherUserId: conv.owner_id };
        }
        if (conv.owner_id === userId) {
            return { valid: true, otherUserId: conv.student_id };
        }

        return { valid: false };
    } catch (error) {
        console.error('[DB] verifyConversationAccess error:', error.message);
        return { valid: false };
    }
}

/**
 * Save message to database.
 * 
 * WHY SAVE BEFORE EMIT:
 * - Message must be persisted before delivery
 * - If DB fails, message is NOT delivered (prevents ghost messages)
 * - DB id is authoritative
 * 
 * @param {number} conversationId 
 * @param {number} senderId 
 * @param {string} text 
 * @returns {Promise<{id: number, createdAt: string}|null>}
 */
async function saveMessage(conversationId, senderId, text) {
    try {
        const [result] = await db.execute(`
            INSERT INTO messages (conversation_id, sender_id, message, created_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
        `, [conversationId, senderId, text]);

        // Get the created timestamp
        const [rows] = await db.execute(`
            SELECT created_at FROM messages WHERE id = ?
        `, [result.insertId]);

        // Update conversation's updated_at for sorting
        db.execute(
            'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
            [conversationId]
        ).catch(err => console.error('[DB] Failed to touch conversation:', err.message));

        return {
            id: result.insertId,
            createdAt: rows[0].created_at.toISOString(),
        };
    } catch (error) {
        console.error('[DB] saveMessage error:', error.message);
        return null;
    }
}

/**
 * Rate limiter for socket events.
 * 
 * WHY RATE LIMIT:
 * - Prevents spam/DoS
 * - Simple in-memory implementation for ~100 users
 * - Cleans up on disconnect
 */
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX = 5; // 5 messages per second

function checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = rateLimits.get(userId);

    if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW) {
        rateLimits.set(userId, { windowStart: now, count: 1 });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT_MAX) {
        return false;
    }

    userLimit.count++;
    return true;
}

/**
 * Main server initialization.
 */
async function main() {
    await initDatabase();

    // Create Socket.IO server
    // WHY STANDALONE:
    // - Separate from Laravel (runs on different port)
    // - Can scale independently
    // - Clean separation of concerns
    const io = new Server(PORT, {
        cors: {
            origin: CORS_ORIGIN.split(','),
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Connection settings
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    console.log(`[SERVER] Socket.IO server listening on port ${PORT}`);
    console.log(`[SERVER] CORS origin: ${CORS_ORIGIN}`);

    /**
     * Connection handler.
     * 
     * AUTHENTICATION FLOW:
     * 1. Extract token from query param
     * 2. Validate against DB
     * 3. Attach user info to socket
     * 4. Join user's room
     * 5. If any step fails, disconnect immediately
     */
    io.on('connection', async (socket) => {
        const token = socket.handshake.query.token;
        console.log('[SOCKET] Raw token on handshake:', token);

        // Validate token
        const user = await validateToken(db, token);

        if (!user) {
            console.log(`[SOCKET] Connection rejected: invalid token`);
            socket.emit('error', { reason: 'Authentication failed' });
            socket.disconnect(true);
            return;
        }

        // Attach user info to socket
        // WHY: Avoids re-validating on every message
        socket.userId = user.userId;
        socket.userRole = user.role;
        socket.userName = user.name;

        // Join user's room
        // WHY user:{id} FORMAT:
        // - Clear namespace
        // - Easy to emit to specific user
        // - One room per user (not per conversation)
        const userRoom = `user:${user.userId}`;
        socket.join(userRoom);

        console.log(`[SOCKET] User ${user.userId} (${user.name}) connected, joined room ${userRoom}`);

        /**
         * send_message handler.
         * 
         * EXPECTED PAYLOAD:
         * {
         *   "tempId": "uuid",
         *   "conversationId": 123,
         *   "text": "Hello"
         * }
         * 
         * LIFECYCLE:
         * 1. Validate payload
         * 2. Check rate limit
         * 3. Verify conversation access
         * 4. Sanitize text
         * 5. Save to DB
         * 6. Emit to both users
         */
        socket.on('send_message', async (data) => {
            console.log('[SOCKET] send_message received from user:', socket.userId, 'payload:', data);
            const { tempId, conversationId, text } = data || {};

            // Validate payload
            if (!tempId || !conversationId || !text) {
                socket.emit('error', {
                    tempId,
                    reason: 'Invalid message payload',
                });
                return;
            }

            if (typeof text !== 'string' || text.trim().length === 0) {
                socket.emit('error', {
                    tempId,
                    reason: 'Message cannot be empty',
                });
                return;
            }

            if (text.length > 5000) {
                socket.emit('error', {
                    tempId,
                    reason: 'Message too long (max 5000 characters)',
                });
                return;
            }

            // Check rate limit
            if (!checkRateLimit(socket.userId)) {
                socket.emit('error', {
                    tempId,
                    reason: 'Rate limit exceeded. Please slow down.',
                });
                return;
            }

            // Verify conversation access
            const access = await verifyConversationAccess(conversationId, socket.userId);

            if (!access.valid) {
                console.log(`[SOCKET] User ${socket.userId} denied access to conversation ${conversationId}`);
                socket.emit('error', {
                    tempId,
                    reason: 'You do not have access to this conversation',
                });
                return;
            }

            // Sanitize text (basic XSS prevention)
            // WHY: Chat is plain text only, strip any HTML
            const sanitizedText = text.trim().replace(/<[^>]*>/g, '');

            // Save to database
            const saved = await saveMessage(conversationId, socket.userId, sanitizedText);

            if (!saved) {
                socket.emit('error', {
                    tempId,
                    reason: 'Failed to save message. Please try again.',
                });
                return;
            }

            // Build message payload for clients
            const messagePayload = {
                id: saved.id,
                conversationId: conversationId,
                senderId: socket.userId,
                text: sanitizedText,
                createdAt: saved.createdAt,
                tempId: tempId, // Include for sender's optimistic UI reconciliation
            };

            // Emit to BOTH users
            // WHY SEPARATE EMITS:
            // - Clear audit trail
            // - Can customize payload per recipient if needed
            // - Sender gets tempId back, receiver doesn't need it
            const senderRoom = `user:${socket.userId}`;
            const receiverRoom = `user:${access.otherUserId}`;

            io.to(senderRoom).emit('receive_message', messagePayload);
            io.to(receiverRoom).emit('receive_message', {
                ...messagePayload,
                tempId: undefined, // Receiver doesn't need sender's tempId
            });

            console.log(`[SOCKET] Message ${saved.id} sent: ${socket.userId} -> ${access.otherUserId}`);
        });

        /**
         * Disconnect handler.
         * 
         * WHY CLEANUP:
         * - Remove rate limit entry (prevent memory leak)
         * - Log for debugging
         */
        socket.on('disconnect', (reason) => {
            rateLimits.delete(socket.userId);
            console.log(`[SOCKET] User ${socket.userId} disconnected: ${reason}`);
        });

        /**
         * Error handler.
         * 
         * WHY: Log socket errors for debugging
         */
        socket.on('error', (error) => {
            console.error(`[SOCKET] Error for user ${socket.userId}:`, error);
        });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('[SERVER] SIGTERM received, shutting down...');
        io.close();
        await db.end();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('[SERVER] SIGINT received, shutting down...');
        io.close();
        await db.end();
        process.exit(0);
    });
}

// Start server
main().catch(error => {
    console.error('[SERVER] Fatal error:', error);
    process.exit(1);
});
