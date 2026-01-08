// Start server in this process so we don't rely on external background process
require('./server');

const io = require('socket.io-client');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Config (matches server defaults / .env)
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'skillforge',
};

const CHAT_SERVER_URL = process.env.CHAT_SERVER_URL || 'http://localhost:3001';
const TOKEN_STUDENT = process.env.QA_TOKEN_STUDENT || '300|9JsHrQSe3BUJVdLeeWSjsupCKgsCJGsmai2L5qcX279946a2';
const STUDENT_ID = parseInt(process.env.QA_USER_STUDENT || '57', 10);
const BUSINESS_ID = parseInt(process.env.QA_USER_BUSINESS || '58', 10);

async function ensureConversation(db) {
  const [rows] = await db.execute(`SELECT id, student_id, owner_id FROM conversations WHERE student_id = ? AND owner_id = ? LIMIT 1`, [STUDENT_ID, BUSINESS_ID]);
  if (rows.length > 0) return rows[0].id;

  const [res] = await db.execute(`INSERT INTO conversations (student_id, owner_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`, [STUDENT_ID, BUSINESS_ID]);
  return res.insertId;
}

async function run() {
  console.log('[TEST] Starting integration test...');
  const db = await mysql.createPool(DB_CONFIG);

  const conversationId = await ensureConversation(db);
  console.log('[TEST] Using conversationId =', conversationId);

  const socket = io(CHAT_SERVER_URL, {
    query: { token: TOKEN_STUDENT },
    transports: ['websocket'],
    reconnectionAttempts: 3,
    timeout: 5000,
  });

  socket.on('connect', () => {
    console.log('[TEST] Socket connected, socket id=', socket.id);
    const tempId = uuidv4();
    const payload = { tempId, conversationId, text: 'Hello from integration test at ' + new Date().toISOString() };
    console.log('[TEST] Sending message with tempId=', tempId, '(delayed 250ms to avoid race)');
    setTimeout(() => socket.emit('send_message', payload), 250);

    // Wait for receive_message
    const onReceive = async (msg) => {
      console.log('[TEST] Received message payload:', msg);

      // Verify saved in DB
      try {
        const [rows] = await db.execute('SELECT id, conversation_id, sender_id, message FROM messages WHERE id = ? LIMIT 1', [msg.id]);
        if (rows.length === 0) {
          console.error('[TEST] ERROR: Message not found in DB for id', msg.id);
          // Keep process alive for debugging
          socket.disconnect();
          return;
        }
        console.log('[TEST] Message found in DB:', rows[0]);
        console.log('[TEST] Integration test SUCCESS');
        socket.disconnect();
        setTimeout(() => process.exit(0), 1000);
      } catch (err) {
        console.error('[TEST] DB verification failed:', err.message);
        // Keep process alive for debugging
        socket.disconnect();
      }
    };

    socket.on('receive_message', onReceive);

    socket.on('error', (e) => {
      console.error('[TEST] Socket error:', e);
      process.exit(4);
    });
  });

  socket.on('connect_error', (err) => {
    console.error('[TEST] Connection error:', err.message);
    process.exit(5);
  });

  // Timeout overall
  setTimeout(() => {
    console.error('[TEST] Timeout: no message received within 15s');
    process.exit(6);
  }, 15000);
}

run().catch(err => {
  console.error('[TEST] Fatal error:', err.message);
  process.exit(1);
});
