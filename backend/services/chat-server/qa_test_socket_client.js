const io = require('socket.io-client');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Config
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';
const TOKEN = process.env.QA_TOKEN || '300|9JsHrQSe3BUJVdLeeWSjsupCKgsCJGsmai2L5qcX279946a2';
const CONVERSATION_ID = parseInt(process.env.QA_CONVO_ID || '1', 10);

(async () => {
    console.log('[TEST] Connecting to', SOCKET_URL, 'with token', TOKEN.slice(0, 5) + '...');

    const socket = io(SOCKET_URL, {
        query: { token: TOKEN },
        reconnection: false,
        timeout: 5000,
        transports: ['websocket'], // Force websocket transport to avoid CORS xhr poll errors
    });

    socket.on('connect_error', (err) => {
        console.error('[TEST] connect_error', err && err.message ? err.message : err);
        process.exit(1);
    });

    socket.on('connect', async () => {
        console.log('[TEST] Connected, socket id:', socket.id);

        const tempId = uuidv4();
        const text = 'QA Socket test message - ' + new Date().toISOString();

        console.log('[TEST] Sending message', { tempId, conversationId: CONVERSATION_ID, text });
        socket.emit('send_message', { tempId, conversationId: CONVERSATION_ID, text });

        // Wait for receive_message or error
        const timeout = setTimeout(() => {
            console.error('[TEST] Timeout waiting for receive_message');
            socket.disconnect();
            process.exit(1);
        }, 8000);

        socket.on('receive_message', async (msg) => {
            if (msg.tempId === tempId || msg.senderId) {
                clearTimeout(timeout);
                console.log('[TEST] receive_message payload:', msg);

                // Verify persisted in DB
                try {
                    const db = await mysql.createPool({
                        host: process.env.DB_HOST || '127.0.0.1',
                        user: process.env.DB_USERNAME || 'root',
                        password: process.env.DB_PASSWORD || '1234',
                        database: process.env.DB_DATABASE || 'skillforge',
                        waitForConnections: true,
                        connectionLimit: 5,
                    });

                    const [rows] = await db.execute("SELECT id, conversation_id, sender_id, message, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1", [CONVERSATION_ID]);
                    if (rows.length === 0) {
                        console.error('[TEST] No message found in DB');
                        process.exit(1);
                    }
                    console.log('[TEST] Latest DB message:', rows[0]);

                    console.log('[TEST] Socket test SUCCESS');
                    socket.disconnect();
                    process.exit(0);
                } catch (err) {
                    console.error('[TEST] DB verification failed:', err.message);
                    socket.disconnect();
                    process.exit(1);
                }
            }
        });

        socket.on('error', (err) => {
            console.error('[TEST] socket error:', err);
            process.exit(1);
        });
    });
})();
